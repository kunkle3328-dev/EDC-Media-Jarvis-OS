import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
} from '@google/genai';
import { JARVIS_FUNCTION_DECLARATIONS } from './lib/gemini-server';
import {
  buildJarvisSystemInstruction,
  VOICE_PERSONAS,
  VoicePersonaId,
} from './lib/edc-os-config';
import { JarvisRepository } from './lib/database/repository';
import { executeJarvisToolCall } from './lib/jarvis/tools/gateway';
import { verifySessionToken } from './lib/security/auth-and-permissions';

process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('error', (err) => {
    console.warn('[WSS SERVER ERROR]:', err);
  });

  server.on('upgrade', (req, socket, head) => {
    socket.on('error', (err) => {
      console.warn('[SOCKET UPGRADE ERROR]:', err.message);
    });
    const { pathname } = parse(req.url || '/', true);
    if (pathname === '/live') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', async (clientWs: WebSocket, req) => {
    const { query } = parse(req.url || '/', true);
    
    // Extract query parameters correctly
    const sessionToken = String(query.token || '');
    const requestedVoice = String(query.voice || 'Charon');
    const autoGreet = query.autoGreet === 'true';
    const extendedThinking = query.extendedThinking === 'true';
    const clientGen = Number(query.gen || 0);

    const sessionId = `live-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    // Attach client error listener immediately to catch any socket/sender errors
    clientWs.on('error', (err) => {
      console.warn(`[CLIENT WS ERROR] session=${sessionId}:`, err.message);
    });

    const safeSend = (payload: unknown) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
          clientWs.send(data, (sendErr) => {
            if (sendErr) {
              console.warn(`[SAFE SEND ERROR] session=${sessionId}:`, sendErr.message);
            }
          });
        } catch (err: unknown) {
          console.warn(`[SAFE SEND EXCEPTION] session=${sessionId}:`, err instanceof Error ? err.message : err);
        }
      }
    };
    
    let currentTurnId = 1;
    let interruptedTurnFloor = 0;
    let hasSentInitialGreeting = false;
    let isGeminiSetupComplete = false;
    let geminiReady = false;
    const pendingAudioQueue: string[] = [];
    const MAX_PENDING_AUDIO = 50;

    // Monotonic sequence counters
    let serverInSeq = 0;
    let serverOutSeq = 0;

    // session-level metrics
    const metrics = {
      inboundChunks: 0,
      inboundBytes: 0,
      outboundChunks: 0,
      outboundBytes: 0,
      geminiEvents: 0,
      lastLogTime: Date.now(),
    };

    const logMetrics = (force = false) => {
      const now = Date.now();
      if (force || now - metrics.lastLogTime > 2000) {
        console.log(
          `[LIVE METRICS] session=${sessionId} inCh=${metrics.inboundChunks} inBy=${metrics.inboundBytes} outCh=${metrics.outboundChunks} outBy=${metrics.outboundBytes} events=${metrics.geminiEvents} ready=${geminiReady}`
        );
        
        // Push telemetry to client
        safeSend({
          type: 'telemetry',
          sessionId,
          serverRxChunks: metrics.inboundChunks,
          serverRxBytes: metrics.inboundBytes,
          geminiTxChunks: metrics.inboundChunks,
          geminiTxBytes: metrics.inboundBytes,
          geminiRxChunks: metrics.outboundChunks,
          geminiRxBytes: metrics.outboundBytes,
        });

        metrics.lastLogTime = now;
      }
    };

    const authContext = verifySessionToken(sessionToken);
    if (!authContext.authenticated) {
      console.error(`[LIVE STATE] AUTH_FAILED session=${sessionId}`);
      safeSend({
        type: 'error',
        category: 'AUTH',
        error: 'Unauthorized WebSocket connection.',
      });
      try { clientWs.close(); } catch {}
      return;
    }

    console.log(`[LIVE STATE] CONNECTED session=${sessionId} voice=${requestedVoice} role=${authContext.role}`);

    const persona =
      VOICE_PERSONAS.find((v) => v.id === requestedVoice) || VOICE_PERSONAS[0];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(`[LIVE STATE] ERROR session=${sessionId} msg=GEMINI_API_KEY_MISSING`);
      safeSend({
        type: 'error',
        category: 'GEMINI',
        error:
          'GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.',
      });
      try { clientWs.close(); } catch {}
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const modelName = extendedThinking
      ? 'gemini-3.8-live-extended-thinking'
      : 'gemini-3.8-live';

    console.log(`[LIVE CONFIG] model=${modelName} responseModalities=AUDIO voice=${persona.id}`);

    // Always read authoritative persistent state from database
    const authoritativeState = JarvisRepository.getState();
    const currentSystemInstruction = buildJarvisSystemInstruction(
      persona,
      authoritativeState,
      'live_voice'
    );

    const pendingClientMessages: string[] = [];
    let activeSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let setupTimeoutTimer: NodeJS.Timeout | null = null;

    const processClientPayload = (rawStr: string) => {
      if (!activeSession) {
        pendingClientMessages.push(rawStr);
        return;
      }
      try {
        const msg = JSON.parse(rawStr);
        
        // Handle client-side turn finalization/barge-in
        if (msg.type === 'bargeIn') {
          console.log(`[LIVE SERVER IN] type=bargeIn session=${sessionId} turnBefore=${currentTurnId}`);
          interruptedTurnFloor = currentTurnId;
          currentTurnId += 1;
          return;
        }

        if (msg.type === 'ping') {
          safeSend({
            type: 'pong',
            sessionId,
            serverTime: Date.now(),
          });
          return;
        }

        if (msg.type === 'audio' && msg.audio) {
          serverInSeq++;
          metrics.inboundChunks++;
          metrics.inboundBytes += msg.audio.length;
          
          console.log(`[LIVE AUDIO SERVER RX] session=${sessionId} seq=${serverInSeq} bytes=${msg.audio.length} ready=${geminiReady}`);

          if (!geminiReady) {
            if (pendingAudioQueue.length < MAX_PENDING_AUDIO) {
              pendingAudioQueue.push(msg.audio);
              console.log(`[LIVE AUDIO QUEUED] session=${sessionId} queueSize=${pendingAudioQueue.length}`);
            }
            return;
          }

          logMetrics();

          console.log(`[GEMINI AUDIO TX] session=${sessionId} seq=${serverInSeq} bytes=${msg.audio.length} rate=16000`);
          activeSession.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.type === 'text' && msg.text) {
          console.log(`[LIVE SERVER IN] type=text session=${sessionId} text="${msg.text}"`);
          currentTurnId += 1;
          activeSession.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: String(msg.text) }],
              },
            ],
            turnComplete: true,
          });
        }
      } catch (parseErr) {
        console.error('Error processing client WS message:', parseErr);
      }
    };

    clientWs.on('message', (rawData) => {
      processClientPayload(rawData.toString());
    });

    try {
      console.log(`[LIVE STATE] GEMINI_CONNECTING session=${sessionId} model=${modelName}`);
      
      const sessionConfig: Record<string, unknown> = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: persona.id },
          },
        },
        systemInstruction: {
          parts: [{ text: currentSystemInstruction }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: JARVIS_FUNCTION_DECLARATIONS }],
      };

      if (extendedThinking) {
        sessionConfig.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH,
        };
      }

      const sessionPromise = ai.live.connect({
        model: modelName,
        config: sessionConfig,
        callbacks: {
          onopen: () => {
            console.log(`[GEMINI] SOCKET_OPEN session=${sessionId}`);
            // Arm 10-second setupComplete watchdog timer
            setupTimeoutTimer = setTimeout(() => {
              if (!geminiReady) {
                console.error(`[GEMINI_SETUP_TIMEOUT] session=${sessionId} model=${modelName} elapsed=10000ms`);
                safeSend({
                  type: 'error',
                  category: 'GEMINI_SETUP_TIMEOUT',
                  error: `Gemini Live setup timed out on model ${modelName}.`,
                });
              }
            }, 10000);
          },
          onmessage: async (message: LiveServerMessage) => {
            metrics.geminiEvents++;
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const messageAny = message as any;

            // Handle setupComplete authoritatively
            if (messageAny.setupComplete || message.setupComplete) {
              if (setupTimeoutTimer) {
                clearTimeout(setupTimeoutTimer);
                setupTimeoutTimer = null;
              }

              console.log(`[GEMINI RAW MESSAGE] setupComplete: true session=${sessionId}`);
              console.log(`[GEMINI] SETUP_COMPLETE session=${sessionId}`);
              console.log(`[LIVE] GEMINI_READY session=${sessionId}`);
              
              geminiReady = true;
              isGeminiSetupComplete = true;

              const session = activeSession || (await sessionPromise);

              // Flush queued microphone audio
              const queuedCount = pendingAudioQueue.length;
              console.log(`[LIVE FLUSH AUDIO] session=${sessionId} flushingChunks=${queuedCount}`);
              while (pendingAudioQueue.length > 0) {
                const queuedAudio = pendingAudioQueue.shift();
                if (queuedAudio && session) {
                  session.sendRealtimeInput({
                    audio: {
                      data: queuedAudio,
                      mimeType: 'audio/pcm;rate=16000',
                    },
                  });
                }
              }

              safeSend({
                type: 'connected',
                ready: true,
                sessionId,
                model: modelName,
                voice: persona.id,
                businessState: JarvisRepository.getState(),
              });

              // Single Greeting Controller
              if (autoGreet && !hasSentInitialGreeting && session) {
                hasSentInitialGreeting = true;
                console.log(`[LIVE STATE] Sending initial greeting session=${sessionId}`);
                session.sendClientContent({
                  turns: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: 'Greet me naturally in one concise sentence as my J.A.R.V.I.S. executive partner and confirm our live voice link is active.',
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                });
              }
              return;
            }

            // Diagnostic logging of incoming messages
            if (message.serverContent) {
              const sc = message.serverContent;
              const hasModelTurn = !!sc.modelTurn;
              const hasParts = !!sc.modelTurn?.parts?.length;
              const isInterrupted = !!sc.interrupted;
              const isTurnComplete = !!sc.turnComplete;
              console.log(`[GEMINI MSG] type=serverContent session=${sessionId} turn=${currentTurnId} modelTurn=${hasModelTurn} parts=${hasParts} interrupted=${isInterrupted} turnComplete=${isTurnComplete}`);
            } else if (message.toolCall) {
              console.log(`[GEMINI MSG] type=toolCall session=${sessionId} calls=${message.toolCall.functionCalls?.length}`);
            }

            // 1. Handle server-side VAD barge-in interruption
            if (message.serverContent?.interrupted) {
              console.log(`[GEMINI IN] type=interrupted session=${sessionId} turnAt=${currentTurnId}`);
              interruptedTurnFloor = currentTurnId;
              currentTurnId += 1;
              safeSend({
                type: 'interrupted',
                sessionId,
                turnId: currentTurnId,
                interrupted: true,
              });
            }

            // 2. Model Turn Audio & Text
            const activeTurnSnapshot = currentTurnId;
            if (activeTurnSnapshot > interruptedTurnFloor) {
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts && Array.isArray(parts)) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    const audioData = part.inlineData.data;
                    const audioBase64 = typeof audioData === 'string' ? audioData : Buffer.from(audioData).toString('base64');
                    
                    metrics.outboundChunks++;
                    metrics.outboundBytes += audioBase64.length;
                    serverOutSeq++;
                    logMetrics();

                    console.log(`[GEMINI AUDIO RX] session=${sessionId} turn=${activeTurnSnapshot} bytes=${audioBase64.length} mimeType=audio/pcm;rate=24000`);
                    console.log(`[LIVE AUDIO BROWSER TX] session=${sessionId} turn=${activeTurnSnapshot} seq=${serverOutSeq} bytes=${audioBase64.length} rate=24000`);

                    safeSend({
                      type: 'audio',
                      sessionId,
                      seq: serverOutSeq,
                      gen: clientGen,
                      turnId: activeTurnSnapshot,
                      audio: audioBase64,
                      mimeType: 'audio/pcm;rate=24000',
                    });
                  }
                  if (part.text) {
                    console.log(`[GEMINI TEXT RX] session=${sessionId} turn=${activeTurnSnapshot} text="${part.text.slice(0, 60)}..."`);
                    safeSend({
                      type: 'modelText',
                      sessionId,
                      turnId: activeTurnSnapshot,
                      text: part.text,
                    });
                  }
                }
              }
            }

            // 3. Transcriptions
            const serverContentAny = message.serverContent as any;
            if (serverContentAny?.inputTranscription?.text) {
              safeSend({
                type: 'inputTranscription',
                sessionId,
                turnId: currentTurnId,
                text: serverContentAny.inputTranscription.text,
              });
            }
            if (serverContentAny?.interimInputTranscription?.text) {
              safeSend({
                type: 'inputTranscription',
                sessionId,
                turnId: currentTurnId,
                text: serverContentAny.interimInputTranscription.text,
                interim: true,
              });
            }

            if (serverContentAny?.outputTranscription?.text && activeTurnSnapshot > interruptedTurnFloor) {
              safeSend({
                type: 'outputTranscription',
                sessionId,
                turnId: currentTurnId,
                text: serverContentAny.outputTranscription.text,
              });
            }

            if (message.serverContent?.turnComplete) {
              console.log(`[GEMINI IN] type=turnComplete session=${sessionId} turnWas=${activeTurnSnapshot}`);
              currentTurnId += 1;
              safeSend({
                type: 'turnComplete',
                sessionId,
                turnId: currentTurnId,
              });
            }

            // 4. Tool Execution (Authoritative)
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              const formattedCalls = functionCalls.map((fc) => ({
                id: fc.id || `live-tc-${Date.now()}`,
                name: fc.name || 'unknown',
                args: (fc.args as Record<string, unknown>) || {},
              }));

              safeSend({
                type: 'toolExecuting',
                sessionId,
                toolCalls: formattedCalls,
              });

              sessionPromise
                .then(async (s) => {
                  const executedResults = [];
                  const functionResponses = [];

                  for (const fc of formattedCalls) {
                    const outcome = await executeJarvisToolCall({
                      id: fc.id,
                      name: fc.name,
                      args: fc.args,
                      sessionToken,
                    });

                    executedResults.push(outcome.result);

                    if (outcome.webSearch) {
                      safeSend({
                        type: 'webSearchResults',
                        sessionId,
                        query: outcome.webSearch.query,
                        summary: outcome.webSearch.summary,
                        sources: outcome.webSearch.sources,
                      });
                    }

                    if (outcome.navigatedView) {
                      safeSend({
                        type: 'navigate',
                        sessionId,
                        view: outcome.navigatedView,
                      });
                    }

                    functionResponses.push({
                      id: fc.id,
                      name: fc.name,
                      response: {
                        success: outcome.result.success,
                        executionId: outcome.result.executionId,
                        message: outcome.result.message,
                        requiresApproval: outcome.result.requiresApproval,
                        data: outcome.result.data,
                        error: outcome.result.error,
                      },
                    });
                  }

                  // Push authoritative persisted database state to the client immediately
                  safeSend({
                    type: 'stateSync',
                    sessionId,
                    businessState: JarvisRepository.getState(),
                    toolResults: executedResults,
                  });

                  s.sendToolResponse({ functionResponses });
                })
                .catch((err) => {
                  console.error('Error executing Live tool call:', err);
                });
            }
          },
          onerror: (err: unknown) => {
            const errDetail =
              err instanceof Error
                ? err.message
                : typeof err === 'object' && err !== null && 'message' in err
                ? String((err as any).message)
                : 'Stream connection interrupted';
            console.warn(`[GEMINI STATUS] session=${sessionId} note=${errDetail}`);
            if (setupTimeoutTimer) {
              clearTimeout(setupTimeoutTimer);
              setupTimeoutTimer = null;
            }
            safeSend({
              type: 'error',
              category: 'GEMINI',
              error: errDetail,
            });
          },
          onclose: () => {
            console.log(`[GEMINI CLOSE] Live session closed gracefully session=${sessionId}`);
            if (setupTimeoutTimer) {
              clearTimeout(setupTimeoutTimer);
              setupTimeoutTimer = null;
            }
            safeSend({
              type: 'closed',
              sessionId,
            });
          },
        },
      });

      activeSession = await sessionPromise;

      // Flush any client messages that arrived during initial promise resolution
      while (pendingClientMessages.length > 0) {
        const nextMsg = pendingClientMessages.shift();
        if (nextMsg) processClientPayload(nextMsg);
      }

      let isCleanedUp = false;
      clientWs.on('close', () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        if (setupTimeoutTimer) {
          clearTimeout(setupTimeoutTimer);
          setupTimeoutTimer = null;
        }
        try {
          activeSession?.close();
        } catch {
          // session already closed
        }
      });
    } catch (connErr: unknown) {
      const connErrMsg =
        connErr instanceof Error
          ? connErr.message
          : 'Failed to connect to Gemini 3.8 Live API';
      console.warn(`[GEMINI CONNECT] session=${sessionId} status=${connErrMsg}`);
      if (setupTimeoutTimer) {
        clearTimeout(setupTimeoutTimer);
        setupTimeoutTimer = null;
      }
      safeSend({
        type: 'error',
        category: 'GEMINI_CONNECT_FAILURE',
        error: connErrMsg,
      });
      try { clientWs.close(); } catch {}
    }
  });

  server.listen(port, hostname, () => {
    console.log(
      `> EDC Media J.A.R.V.I.S. Executive OS ready on http://${hostname}:${port} (Authoritative Live WebSocket: /live)`
    );
  });
});
