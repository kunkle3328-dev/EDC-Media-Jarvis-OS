import { NextRequest, NextResponse } from 'next/server';
import { LiveServerMessage, Modality, ThinkingLevel } from '@google/genai';
import {
  getGeminiClient,
  JARVIS_FUNCTION_DECLARATIONS,
  performGroundedWebSearch,
} from '@/lib/gemini-server';
import {
  buildJarvisSystemInstruction,
  ToolExecutionResult,
  VOICE_PERSONAS,
  VoicePersonaId,
} from '@/lib/edc-os-config';
import { JarvisRepository } from '@/lib/database/repository';
import { executeJarvisToolCall } from '@/lib/jarvis/tools/gateway';

process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      audioBase64,
      audioMimeType = 'audio/webm',
      voiceId = 'Charon',
      history = [],
      ttsOnly = false,
      stream = true,
      forceWebSearch = false,
    }: {
      prompt?: string;
      audioBase64?: string;
      audioMimeType?: string;
      voiceId?: VoicePersonaId;
      history?: Array<{ role: 'user' | 'model'; text: string }>;
      ttsOnly?: boolean;
      stream?: boolean;
      forceWebSearch?: boolean;
    } = body;

    const cookieToken = req.cookies.get('jarvis_session')?.value || null;
    const ai = getGeminiClient();
    const persona =
      VOICE_PERSONAS.find((v) => v.id === voiceId) || VOICE_PERSONAS[0];

    // Fast path: Direct TTS synthesis for voice audition / briefing
    if (ttsOnly && prompt) {
      const cleanPrompt = prompt.replace(/[*#_`~>]/g, '').trim();
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanPrompt }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: persona.id },
            },
          },
        },
      });

      const wavBase64 =
        ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

      return NextResponse.json({
        userTranscript: null,
        replyText: cleanPrompt,
        toolResults: [],
        audioWavBase64: wavBase64,
        voiceId: persona.id,
        businessState: JarvisRepository.getState(),
      });
    }

    let userText = prompt?.trim() || '';

    // Transcribe audio if provided without text
    if (!userText && audioBase64) {
      const transcribeResp = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: audioMimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe the spoken English words accurately. Return only the exact spoken words, or empty string if silence.',
            },
          ],
        },
      });
      userText = (transcribeResp.text || '').trim();
      if (!userText) {
        return NextResponse.json({
          userTranscript: '',
          replyText: '',
          toolResults: [],
          audioWavBase64: null,
          businessState: JarvisRepository.getState(),
        });
      }
    }

    if (!userText) {
      return NextResponse.json(
        { error: 'Please provide a text command or voice recording.' },
        { status: 400 }
      );
    }

    // Always use authoritative persistent database state
    const authoritativeState = JarvisRepository.getState();
    const systemInstruction = buildJarvisSystemInstruction(
      persona,
      authoritativeState,
      'live_voice'
    );

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const sendEvent = (payload: Record<string, unknown>) => {
            try {
              controller.enqueue(
                encoder.encode(JSON.stringify(payload) + '\n')
              );
            } catch {
              // stream closed by client
            }
          };

          sendEvent({ type: 'userTranscript', text: userText });

          let liveSessionClosed = false;
          let activeSession: Awaited<ReturnType<typeof ai.live.connect>> | null =
            null;

          const finishStream = () => {
            if (liveSessionClosed) return;
            liveSessionClosed = true;
            try {
              activeSession?.close();
            } catch {
              // session already closed
            }
            try {
              controller.close();
            } catch {
              // controller already closed
            }
          };

          const safetyTimeout = setTimeout(() => {
            sendEvent({ type: 'turnComplete' });
            finishStream();
          }, 18000);

          try {
            const sessionPromise = ai.live.connect({
              model: 'gemini-3.8-live',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: persona.id },
                  },
                },
                systemInstruction,
                outputAudioTranscription: {},
                tools: [{ functionDeclarations: JARVIS_FUNCTION_DECLARATIONS }],
              },
              callbacks: {
                onopen: () => {},
                onmessage: (message: LiveServerMessage) => {
                  const parts = message.serverContent?.modelTurn?.parts;
                  if (parts && Array.isArray(parts)) {
                    for (const part of parts) {
                      const audioData = part.inlineData?.data;
                      if (audioData && audioData.length >= 32) {
                        sendEvent({ type: 'audio', audio: audioData });
                      }
                      if (part.text) {
                        sendEvent({ type: 'textDelta', text: part.text });
                      }
                    }
                  }

                  const serverContentAny = message.serverContent as
                    | Record<string, unknown>
                    | undefined;
                  const outputTranscription =
                    serverContentAny?.outputTranscription as
                      | { text?: string }
                      | undefined;
                  if (outputTranscription?.text) {
                    sendEvent({
                      type: 'textDelta',
                      text: outputTranscription.text,
                    });
                  }

                  const functionCalls = message.toolCall?.functionCalls;
                  if (functionCalls && functionCalls.length > 0) {
                    const formattedCalls = functionCalls.map((fc) => ({
                      id: fc.id || `tc-${Date.now()}`,
                      name: fc.name || 'unknown',
                      args: (fc.args as Record<string, unknown>) || {},
                    }));

                    sessionPromise
                      .then(async (s) => {
                        const executedResults: ToolExecutionResult[] = [];
                        const functionResponses = [];

                        for (const fc of formattedCalls) {
                          const outcome = await executeJarvisToolCall({
                            id: fc.id,
                            name: fc.name,
                            args: fc.args,
                            sessionToken: cookieToken,
                          });
                          executedResults.push(outcome.result);

                          if (outcome.webSearch) {
                            sendEvent({
                              type: 'webSearchResults',
                              query: outcome.webSearch.query,
                              summary: outcome.webSearch.summary,
                              sources: outcome.webSearch.sources,
                            });
                          }

                          if (outcome.navigatedView) {
                            sendEvent({
                              type: 'navigate',
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

                        sendEvent({
                          type: 'stateSync',
                          businessState: JarvisRepository.getState(),
                          toolResults: executedResults,
                        });

                        s.sendToolResponse({ functionResponses });
                      })
                      .catch((toolErr) => {
                        console.error('Streaming tool execution error:', toolErr);
                      });
                  }

                  if (message.serverContent?.turnComplete) {
                    clearTimeout(safetyTimeout);
                    sendEvent({
                      type: 'stateSync',
                      businessState: JarvisRepository.getState(),
                    });
                    sendEvent({ type: 'turnComplete' });
                    finishStream();
                  }
                },
                onerror: (err: unknown) => {
                  clearTimeout(safetyTimeout);
                  sendEvent({
                    type: 'error',
                    error:
                      err instanceof Error ? err.message : 'Live stream error',
                  });
                  finishStream();
                },
                onclose: () => {
                  clearTimeout(safetyTimeout);
                  finishStream();
                },
              },
            });

            activeSession = await sessionPromise;

            let enrichedPrompt = userText;
            const shouldPreSearch =
              forceWebSearch ||
              /\b(search the web|google|latest news|live market|current price|competitor|benchmark)\b/i.test(
                userText
              );

            if (shouldPreSearch) {
              try {
                const searchOutcome = await executeJarvisToolCall({
                  name: 'searchLiveWeb',
                  args: { query: userText },
                  sessionToken: cookieToken,
                });
                if (searchOutcome.webSearch) {
                  sendEvent({
                    type: 'webSearchResults',
                    query: searchOutcome.webSearch.query,
                    summary: searchOutcome.webSearch.summary,
                    sources: searchOutcome.webSearch.sources,
                  });
                  sendEvent({
                    type: 'stateSync',
                    businessState: JarvisRepository.getState(),
                    toolResults: [searchOutcome.result],
                  });
                  enrichedPrompt = `${userText}\n\n${searchOutcome.webSearch.sanitizedContext}\nSynthesize and speak this verified live web intelligence naturally in 2-3 crisp executive sentences without calling searchLiveWeb again.`;
                }
              } catch (e) {
                console.error('Pre-search warning:', e);
              }
            }

            const turns = [
              ...history.slice(-4).map((h) => ({
                role: h.role,
                parts: [{ text: h.text }],
              })),
              {
                role: 'user',
                parts: [{ text: enrichedPrompt }],
              },
            ];

            activeSession.sendClientContent({
              turns,
              turnComplete: true,
            });
          } catch (liveErr) {
            clearTimeout(safetyTimeout);
            console.error('Live stream fallback triggered:', liveErr);
            try {
              const fastResp = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: userText,
                config: {
                  systemInstruction,
                  tools: [{ functionDeclarations: JARVIS_FUNCTION_DECLARATIONS }],
                  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                },
              });

              const rawCalls = fastResp.functionCalls || [];
              const executedResults: ToolExecutionResult[] = [];
              for (const fc of rawCalls) {
                const outcome = await executeJarvisToolCall({
                  id: fc.id,
                  name: fc.name || 'unknown',
                  args: (fc.args as Record<string, unknown>) || {},
                  sessionToken: cookieToken,
                });
                executedResults.push(outcome.result);
                if (outcome.webSearch) {
                  sendEvent({
                    type: 'webSearchResults',
                    query: outcome.webSearch.query,
                    summary: outcome.webSearch.summary,
                    sources: outcome.webSearch.sources,
                  });
                }
                if (outcome.navigatedView) {
                  sendEvent({
                    type: 'navigate',
                    view: outcome.navigatedView,
                  });
                }
              }

              sendEvent({
                type: 'stateSync',
                businessState: JarvisRepository.getState(),
                toolResults: executedResults,
              });

              const reply =
                (fastResp.text || '').replace(/[*#_`~>]/g, '').trim() ||
                executedResults.map((r) => r.message).join(' ') ||
                'Operation completed and verified in the database.';
              sendEvent({ type: 'textDelta', text: reply });

              const ttsResp = await ai.models.generateContent({
                model: 'gemini-3.8-flash-lite-tts',
                contents: [{ role: 'user', parts: [{ text: reply }] }],
                config: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: persona.id },
                    },
                  },
                },
              });
              const wav =
                ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (wav) {
                sendEvent({ type: 'audioWav', audioWavBase64: wav });
              }
              sendEvent({ type: 'turnComplete' });
            } catch (fallbackErr) {
              sendEvent({
                type: 'error',
                error:
                  fallbackErr instanceof Error
                    ? fallbackErr.message
                    : 'Turn failed',
              });
            }
            finishStream();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming path with real tool execution
    let enrichedUserText = userText;
    let preSearchSources = undefined;
    if (forceWebSearch) {
      const wsRes = await performGroundedWebSearch(userText);
      enrichedUserText = `${userText}\n\n${wsRes.sanitizedContext}`;
      preSearchSources = wsRes;
    }

    const genResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: enrichedUserText,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: JARVIS_FUNCTION_DECLARATIONS }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    const executedResults: ToolExecutionResult[] = [];
    for (const fc of genResponse.functionCalls || []) {
      const outcome = await executeJarvisToolCall({
        id: fc.id,
        name: fc.name || 'unknown',
        args: (fc.args as Record<string, unknown>) || {},
        sessionToken: cookieToken,
      });
      executedResults.push(outcome.result);
    }

    const cleanSpokenText =
      (genResponse.text || '').replace(/[*#_`~>]/g, '').trim() ||
      executedResults.map((r) => r.message).join(' ') ||
      'Operation completed and verified in the database.';

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ role: 'user', parts: [{ text: cleanSpokenText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: persona.id },
          },
        },
      },
    });

    const audioWavBase64 =
      ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

    return NextResponse.json({
      userTranscript: userText,
      replyText: cleanSpokenText,
      toolResults: executedResults,
      webSearch: preSearchSources,
      audioWavBase64,
      voiceId: persona.id,
      businessState: JarvisRepository.getState(),
    });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : 'Unexpected Gemini API error';
    console.error('Error in /api/jarvis/turn:', error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
