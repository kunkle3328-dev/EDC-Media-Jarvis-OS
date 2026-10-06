'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EdcBusinessState,
  ToolExecutionResult,
  VoiceDiagnosticsTelemetry,
  VoicePersonaId,
  VoiceTransportState,
} from '@/lib/edc-os-config';
import { jarvisNdjsonStreamRequest } from '@/lib/client-api';

export type JarvisVoiceState =
  | 'standby'
  | 'connecting'
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'jarvis_speaking';

export interface WebSearchCitation {
  title: string;
  uri: string;
}

export interface WebSearchPayload {
  query: string;
  summary: string;
  sources: WebSearchCitation[];
  timestamp?: string;
}

export interface TranscriptEntry {
  id: string;
  timestamp: string;
  role: 'user' | 'jarvis' | 'system';
  text: string;
  voiceId?: VoicePersonaId;
  latencyMs?: number;
  interrupted?: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  toolResults?: ToolExecutionResult[];
  webSearch?: WebSearchPayload;
}

interface UseJarvisLiveOptions {
  voiceId: VoicePersonaId;
  extendedThinking: boolean;
  vadSensitivity: number;
  businessState: EdcBusinessState;
  sessionToken?: string | null;
  onStateSync: (
    nextState: EdcBusinessState,
    toolResults?: ToolExecutionResult[]
  ) => void;
  onNavigate?: (view: string) => void;
}

function downsampleTo16k(
  input: Float32Array,
  inputSampleRate: number
): Float32Array {
  if (inputSampleRate === 16000) return input;
  const ratio = inputSampleRate / 16000;
  const outLength = Math.floor(input.length / ratio);
  const result = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const idx0 = Math.floor(srcIndex);
    const idx1 = Math.min(input.length - 1, idx0 + 1);
    const frac = srcIndex - idx0;
    result[i] = input[idx0] * (1 - frac) + input[idx1] * frac;
  }
  return result;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function int16ArrayToBase64(int16Buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(int16Buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const samples = new Float32Array(len / 2);
  
  for (let i = 0; i < samples.length; i++) {
    // Explicit little-endian decode
    const b0 = binary.charCodeAt(i * 2);
    const b1 = binary.charCodeAt(i * 2 + 1);
    const int16 = b0 | (b1 << 8);
    const signed = int16 >= 0x8000 ? int16 - 0x10000 : int16;
    samples[i] = signed / 32768.0;
  }
  return samples;
}

function formatNowTime(): string {
  const d = new Date();
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function useJarvisLive({
  voiceId,
  extendedThinking,
  vadSensitivity,
  businessState,
  sessionToken,
  onStateSync,
  onNavigate,
}: UseJarvisLiveOptions) {
  const [voiceState, setVoiceState] = useState<JarvisVoiceState>('standby');
  const [transportState, setTransportState] =
    useState<VoiceTransportState>('DISCONNECTED');
  const [isDuplexActive, setIsDuplexActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transportMode, setTransportMode] = useState<
    'gemini-3.8-live-ws' | 'gemini-3.8-live-stream'
  >('gemini-3.8-live-ws');
  const [bargeInCount, setBargeInCount] = useState(0);
  const [droppedStalePackets, setDroppedStalePackets] = useState(0);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(640);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [liveCaption, setLiveCaption] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastErrorCategory, setLastErrorCategory] =
    useState<VoiceDiagnosticsTelemetry['lastErrorCategory']>(null);
  const [micPermission, setMicPermission] = useState<
    'granted' | 'denied' | 'prompt' | 'unknown'
  >('unknown');
  const [sessionId, setSessionId] = useState<string>('standby');
  const [generation, setGeneration] = useState<number>(0);
  const [activeTurnId, setActiveTurnId] = useState<number>(1);
  const [latestWebSearch, setLatestWebSearch] =
    useState<WebSearchPayload | null>(null);
  const [telemetry, setTelemetry] = useState<Partial<VoiceDiagnosticsTelemetry>>({});

  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([
    {
      id: 'init-1',
      timestamp: '09:00:00',
      role: 'jarvis',
      voiceId: 'Charon',
      latencyMs: 640,
      text: 'J.A.R.V.I.S. Executive Operating System online. Authoritative database synchronized, RBAC security gateway armed, and Gemini 3.8 Live full-duplex acoustic link ready.',
    },
  ]);

  const voiceStateRef = useRef<JarvisVoiceState>('standby');
  const transportStateRef = useRef<VoiceTransportState>('DISCONNECTED');
  const isDuplexActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const voiceIdRef = useRef<VoicePersonaId>(voiceId);
  const extendedThinkingRef = useRef(extendedThinking);
  const vadSensitivityRef = useRef(vadSensitivity);
  const businessStateRef = useRef(businessState);
  const sessionTokenRef = useRef(sessionToken);
  const onStateSyncRef = useRef(onStateSync);
  const onNavigateRef = useRef(onNavigate);
  const transcriptsRef = useRef<TranscriptEntry[]>(transcripts);

  const activeTurnIdRef = useRef<number>(1);
  const generationRef = useRef<number>(0);
  const interruptedTurnFloorRef = useRef<number>(0);

  const setStatesSync = useCallback(
    (nextVoice: JarvisVoiceState, nextTransport?: VoiceTransportState) => {
      voiceStateRef.current = nextVoice;
      setVoiceState(nextVoice);
      if (nextTransport) {
        transportStateRef.current = nextTransport;
        setTransportState(nextTransport);
      }
    },
    []
  );

  // Unified Hardware AudioContext & Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const silentSinkGainRef = useRef<GainNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeHtmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isJarvisSpeakingRef = useRef<boolean>(false);
  const jarvisSpeakStartTimeRef = useRef<number>(0);
  const playbackEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnStartTimestampRef = useRef<number>(0);

  const metricsRef = useRef({
    browserTxChunks: 0,
    browserTxBytes: 0,
    serverRxChunks: 0,
    serverRxBytes: 0,
    geminiTxChunks: 0,
    geminiTxBytes: 0,
    geminiRxChunks: 0,
    geminiRxBytes: 0,
    browserRxChunks: 0,
    browserRxBytes: 0,
    playbackChunks: 0,
    playbackBytes: 0,
    interruptions: 0,
    turnCompleteEvents: 0,
    inputTranscriptEvents: 0,
    outputTranscriptEvents: 0,
    lastMetricLog: 0,
  });

  const logClientMetrics = () => {
    const now = Date.now();
    if (now - metricsRef.current.lastMetricLog > 2500) {
      console.log(
        `[LIVE TELEMETRY] gen=${generationRef.current} tx=${metricsRef.current.browserTxChunks} rx=${metricsRef.current.browserRxChunks} pb=${metricsRef.current.playbackChunks} int=${metricsRef.current.interruptions} tc=${metricsRef.current.turnCompleteEvents} ctx=${audioCtxRef.current?.state}`
      );
      metricsRef.current.lastMetricLog = now;
    }
  };

  const consecutiveSpeechFramesRef = useRef<number>(0);
  const silenceFramesRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackChunksRef = useRef<Blob[]>([]);
  const isFallbackTurnInFlightRef = useRef<boolean>(false);

  const currentUserCaptionRef = useRef<string>('');
  const currentJarvisCaptionRef = useRef<string>('');

  const ensureAudioEngine = useCallback(async (): Promise<AudioContext> => {
    if (!audioCtxRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }

    const ctx = audioCtxRef.current;

    // Ensure audio engine is connected properly
    if (!masterGainRef.current) {
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;
      
      const outAnalyser = ctx.createAnalyser();
      outAnalyser.fftSize = 256;
      outAnalyser.smoothingTimeConstant = 0.65;

      masterGain.connect(outAnalyser);
      outAnalyser.connect(ctx.destination);
      
      masterGainRef.current = masterGain;
      outputAnalyserRef.current = outAnalyser;
      console.log('[AUDIO GRAPH] destinationConnected=true gain=1.0 contextState=' + ctx.state);
    }

    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
        console.log(`[AUDIO CONTEXT] forced resume, final state: ${ctx.state}`);
      } catch (e) {
        console.warn('[AUDIO CONTEXT] resume warning:', e);
      }
    }

    return ctx;
  }, []);

  // Immediately halt all scheduled/playing AI audio (True Barge-In)
  const stopJarvisPlayback = useCallback(
    (reason: 'barge_in' | 'manual' = 'manual') => {
      console.log(`[AUDIO PLAYBACK] stop reason=${reason}`);
      if (playbackEndTimerRef.current) {
        clearTimeout(playbackEndTimerRef.current);
        playbackEndTimerRef.current = null;
      }

      // Advance interrupted turn floor so any in-flight packets from the old turn are discarded
      interruptedTurnFloorRef.current = activeTurnIdRef.current;
      activeTurnIdRef.current += 1;
      setActiveTurnId(activeTurnIdRef.current);

      activeSourcesRef.current.forEach((src) => {
        try {
          src.onended = null;
          src.stop(0);
          src.disconnect();
        } catch {
          // already stopped
        }
      });
      activeSourcesRef.current.clear();

      if (activeHtmlAudioRef.current) {
        try {
          activeHtmlAudioRef.current.pause();
          activeHtmlAudioRef.current.currentTime = 0;
        } catch {
          // ignore
        }
        activeHtmlAudioRef.current = null;
      }

      if (masterGainRef.current && audioCtxRef.current) {
        try {
          const now = audioCtxRef.current.currentTime;
          masterGainRef.current.gain.cancelScheduledValues(now);
          masterGainRef.current.gain.setValueAtTime(0.0001, now);
          masterGainRef.current.gain.exponentialRampToValueAtTime(
            1.0,
            now + 0.03
          );
        } catch {
          // ignore
        }
      }

      if (audioCtxRef.current) {
        nextStartTimeRef.current = audioCtxRef.current.currentTime;
      } else {
        nextStartTimeRef.current = 0;
      }

      const wasSpeaking = isJarvisSpeakingRef.current;
      isJarvisSpeakingRef.current = false;

      if (reason === 'barge_in' && wasSpeaking) {
        setBargeInCount((c) => c + 1);
        setLiveCaption('Barge-in verified — listening to your override...');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'bargeIn' }));
        }
      }

      if (isDuplexActiveRef.current) {
        setStatesSync(
          reason === 'barge_in' ? 'user_speaking' : 'listening',
          reason === 'barge_in' ? 'INTERRUPTED' : 'LISTENING'
        );
      } else {
        setStatesSync('standby', 'READY');
      }
    },
    [setStatesSync]
  );

  // Schedule a 24kHz PCM16 audio chunk onto the gapless timeline with turn-ID verification
  const enqueuePcm24kChunk = useCallback(
    async (base64Pcm: string, packetTurnId?: number, packetGen?: number) => {
      console.log(`[AUDIO IN] Received chunk bytes=${base64Pcm.length} turn=${packetTurnId} gen=${packetGen}`);
      
      // Generation check to discard audio from old sessions
      if (typeof packetGen === 'number' && packetGen !== generationRef.current) {
        console.warn(`[AUDIO IN] Discarding audio from stale generation: ${packetGen} (current: ${generationRef.current})`);
        return;
      }

      if (
        typeof packetTurnId === 'number' &&
        packetTurnId <= interruptedTurnFloorRef.current
      ) {
        setDroppedStalePackets((c) => c + 1);
        return;
      }

      metricsRef.current.browserRxChunks++;
      metricsRef.current.browserRxBytes += base64Pcm.length;
      logClientMetrics();

      try {
        const float32 = base64Pcm16ToFloat32(base64Pcm);
        if (float32.length === 0) {
          console.warn('[AUDIO DECODE] Decoded empty float32 chunk');
          return;
        }

        const ctx = await ensureAudioEngine();
        if (!masterGainRef.current) {
          console.error('[AUDIO GRAPH] No master gain node connected');
          return;
        }

        if (!isJarvisSpeakingRef.current) {
          isJarvisSpeakingRef.current = true;
          console.log('[AUDIO PLAYBACK] started=true');
          jarvisSpeakStartTimeRef.current = performance.now();
          if (turnStartTimestampRef.current > 0) {
            const lat = Math.max(
              140,
              Math.round(performance.now() - turnStartTimestampRef.current)
            );
            setLastLatencyMs(lat);
            console.log(`[LATENCY] TTFA: ${lat}ms`);
            turnStartTimestampRef.current = 0;
          }
        }

        setStatesSync('jarvis_speaking', 'SPEAKING');

        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(masterGainRef.current);

        const now = ctx.currentTime;
        const startAt = Math.max(now + 0.015, nextStartTimeRef.current);
        
        console.log(`[AUDIO QUEUE] samples=${float32.length} durationMs=${(audioBuffer.duration * 1000).toFixed(1)} nextPlaybackTime=${startAt.toFixed(3)}`);
        
        source.start(startAt);
        nextStartTimeRef.current = startAt + audioBuffer.duration;
        activeSourcesRef.current.add(source);
        
        metricsRef.current.playbackChunks++;
        metricsRef.current.playbackBytes += float32.length * 2;
        if (metricsRef.current.playbackChunks % 20 === 1) {
          console.log(`[PLAYBACK START] chunk=${metricsRef.current.playbackChunks} samples=${float32.length} durationMs=${(audioBuffer.duration * 1000).toFixed(1)} nextPlaybackTime=${startAt.toFixed(3)}`);
        }
        logClientMetrics();

        source.onended = () => {
          activeSourcesRef.current.delete(source);
          if (activeSourcesRef.current.size === 0) {
            if (playbackEndTimerRef.current) {
              clearTimeout(playbackEndTimerRef.current);
            }
            playbackEndTimerRef.current = setTimeout(() => {
              if (activeSourcesRef.current.size === 0) {
                isJarvisSpeakingRef.current = false;
                console.log('[AUDIO PLAYBACK] ended=true');
                setStatesSync(
                  isDuplexActiveRef.current ? 'listening' : 'standby',
                  isDuplexActiveRef.current ? 'LISTENING' : 'READY'
                );
              }
            }, 140);
          }
        };
      } catch (err) {
        console.error('[AUDIO DECODE] PCM_DECODE_FAILED:', err);
        setLastErrorCategory('AUDIO_PLAYBACK');
      }
    },
    [ensureAudioEngine, setStatesSync]
  );

  // Play WAV/PCM base64 returned by /api/jarvis/turn or /api/jarvis/protocol
  const playWavBase64 = useCallback(
    async (base64Audio: string) => {
      if (!base64Audio) return;
      try {
        const ctx = await ensureAudioEngine();
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const isRiffWav =
          bytes.length > 44 &&
          bytes[0] === 0x52 && // R
          bytes[1] === 0x49 && // I
          bytes[2] === 0x46 && // F
          bytes[3] === 0x46; // F

        if (isRiffWav) {
          try {
            const decodedBuffer = await ctx.decodeAudioData(
              bytes.buffer.slice(0)
            );
            if (!masterGainRef.current) return;

            isJarvisSpeakingRef.current = true;
            jarvisSpeakStartTimeRef.current = performance.now();
            setStatesSync('jarvis_speaking', 'SPEAKING');

            const source = ctx.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(masterGainRef.current);

            const now = ctx.currentTime;
            const startAt = Math.max(now + 0.01, nextStartTimeRef.current);
            source.start(startAt);
            nextStartTimeRef.current = startAt + decodedBuffer.duration;
            activeSourcesRef.current.add(source);

            source.onended = () => {
              activeSourcesRef.current.delete(source);
              if (activeSourcesRef.current.size === 0) {
                isJarvisSpeakingRef.current = false;
                setStatesSync(
                  isDuplexActiveRef.current ? 'listening' : 'standby',
                  isDuplexActiveRef.current ? 'LISTENING' : 'READY'
                );
              }
            };
            return;
          } catch {
            // Fallback to HTMLAudioElement if decodeAudioData fails
            const blob = new Blob([bytes], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            activeHtmlAudioRef.current = audio;
            isJarvisSpeakingRef.current = true;
            jarvisSpeakStartTimeRef.current = performance.now();
            setStatesSync('jarvis_speaking', 'SPEAKING');
            audio.onended = () => {
              URL.revokeObjectURL(url);
              activeHtmlAudioRef.current = null;
              isJarvisSpeakingRef.current = false;
              setStatesSync(
                isDuplexActiveRef.current ? 'listening' : 'standby',
                isDuplexActiveRef.current ? 'LISTENING' : 'READY'
              );
            };
            await audio.play();
            return;
          }
        }

        await enqueuePcm24kChunk(base64Audio);
      } catch (err) {
        console.error('Error playing synthesized audio:', err);
        setLastErrorCategory('AUDIO_PLAYBACK');
      }
    },
    [enqueuePcm24kChunk, ensureAudioEngine, setStatesSync]
  );

  // Send a conversational turn over streaming NDJSON (/api/jarvis/turn)
  const sendTurnViaApi = useCallback(
    async (params: {
      prompt?: string;
      audioBase64?: string;
      audioMimeType?: string;
      ttsOnly?: boolean;
      forceWebSearch?: boolean;
    }) => {
      if (isFallbackTurnInFlightRef.current && !params.ttsOnly) return;
      isFallbackTurnInFlightRef.current = true;

      try {
        await ensureAudioEngine();
        const t0 = performance.now();
        turnStartTimestampRef.current = t0;
        if (!params.ttsOnly) {
          setStatesSync('thinking', 'THINKING');
          setLiveCaption('J.A.R.V.I.S. processing executive turn...');
        }

        const recentHistory = transcriptsRef.current
          .filter((t) => t.role === 'user' || t.role === 'jarvis')
          .slice(-6)
          .map((t) => ({
            role: (t.role === 'user' ? 'user' : 'model') as 'user' | 'model',
            text: t.text,
          }));

        let streamedReplyText = '';
        let firstAudioLogged = false;
        const turnId = `jarvis-stream-${Date.now()}`;
        let executedResults: ToolExecutionResult[] = [];
        let capturedWebSearch: WebSearchPayload | undefined = undefined;

        const outcome = await jarvisNdjsonStreamRequest(
          '/api/jarvis/turn',
          {
            prompt: params.prompt,
            audioBase64: params.audioBase64,
            audioMimeType: params.audioMimeType,
            voiceId: voiceIdRef.current,
            history: recentHistory,
            ttsOnly: params.ttsOnly || false,
            stream: !params.ttsOnly,
            forceWebSearch: params.forceWebSearch || false,
          },
          async (evt) => {
            if (
              evt.type === 'userTranscript' &&
              typeof evt.text === 'string' &&
              !params.prompt &&
              evt.text.trim()
            ) {
              setTranscripts((prev) => [
                ...prev,
                {
                  id: `usr-${Date.now()}`,
                  timestamp: formatNowTime(),
                  role: 'user',
                  text: String(evt.text).trim(),
                },
              ]);
            }

            if (evt.type === 'audio' && typeof evt.audio === 'string') {
              if (!firstAudioLogged) {
                firstAudioLogged = true;
                const lat = Math.max(150, Math.round(performance.now() - t0));
                setLastLatencyMs(lat);
              }
              await enqueuePcm24kChunk(evt.audio);
            }

            if (
              evt.type === 'audioWav' &&
              typeof evt.audioWavBase64 === 'string'
            ) {
              if (!firstAudioLogged) {
                firstAudioLogged = true;
                const lat = Math.max(150, Math.round(performance.now() - t0));
                setLastLatencyMs(lat);
              }
              await playWavBase64(evt.audioWavBase64);
            }

            if (evt.type === 'textDelta' && typeof evt.text === 'string') {
              streamedReplyText += evt.text;
              const cleanText = streamedReplyText.trim();
              setLiveCaption(cleanText);
              setTranscripts((prev) => {
                const existingIdx = prev.findIndex((item) => item.id === turnId);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = {
                    ...updated[existingIdx],
                    text: cleanText,
                    toolResults:
                      executedResults.length > 0
                        ? executedResults
                        : updated[existingIdx].toolResults,
                    webSearch:
                      capturedWebSearch || updated[existingIdx].webSearch,
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: turnId,
                    timestamp: formatNowTime(),
                    role: 'jarvis',
                    voiceId: voiceIdRef.current,
                    latencyMs: Math.round(performance.now() - t0),
                    text: cleanText,
                    toolResults:
                      executedResults.length > 0 ? executedResults : undefined,
                    webSearch: capturedWebSearch,
                  },
                ];
              });
            }

            if (
              evt.type === 'stateSync' &&
              evt.businessState &&
              typeof evt.businessState === 'object'
            ) {
              const tr = Array.isArray(evt.toolResults)
                ? (evt.toolResults as ToolExecutionResult[])
                : undefined;
              if (tr) executedResults = tr;
              onStateSyncRef.current(
                evt.businessState as EdcBusinessState,
                tr
              );
            }

            if (
              evt.type === 'navigate' &&
              typeof evt.view === 'string' &&
              onNavigateRef.current
            ) {
              onNavigateRef.current(evt.view);
            }

            if (evt.type === 'webSearchResults') {
              const wsPayload: WebSearchPayload = {
                query: String(evt.query || params.prompt || 'Live Web Search'),
                summary: String(evt.summary || ''),
                sources: Array.isArray(evt.sources)
                  ? (evt.sources as WebSearchCitation[])
                  : [],
                timestamp: formatNowTime(),
              };
              capturedWebSearch = wsPayload;
              setLatestWebSearch(wsPayload);
            }

            if (evt.type === 'error' && typeof evt.error === 'string') {
              setErrorMessage(evt.error);
              setLastErrorCategory('GEMINI');
            }
          }
        );

        if (outcome.isNdjson) {
          if (!firstAudioLogged) {
            setStatesSync(
              isDuplexActiveRef.current ? 'listening' : 'standby',
              isDuplexActiveRef.current ? 'LISTENING' : 'READY'
            );
          }
          return;
        }

        const data = (outcome.jsonFallback || {}) as {
          businessState?: EdcBusinessState;
          toolResults?: ToolExecutionResult[];
          replyText?: string;
          webSearch?: WebSearchPayload;
          audioWavBase64?: string;
        };
        const latency = Math.round(performance.now() - t0);
        setLastLatencyMs(latency);

        if (data.businessState) {
          onStateSyncRef.current(data.businessState, data.toolResults);
        }

        if (data.replyText && !params.ttsOnly) {
          setLiveCaption(data.replyText);
          setTranscripts((prev) => [
            ...prev,
            {
              id: `jarvis-${Date.now()}`,
              timestamp: formatNowTime(),
              role: 'jarvis',
              voiceId: voiceIdRef.current,
              latencyMs: latency,
              text: data.replyText || '',
              toolResults: data.toolResults,
              webSearch: data.webSearch,
            },
          ]);
        }

        if (data.audioWavBase64) {
          await playWavBase64(data.audioWavBase64);
        } else {
          setStatesSync(
            isDuplexActiveRef.current ? 'listening' : 'standby',
            isDuplexActiveRef.current ? 'LISTENING' : 'READY'
          );
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to process voice turn';
        setErrorMessage(msg);
        setLastErrorCategory('NETWORK');
        setStatesSync(
          isDuplexActiveRef.current ? 'listening' : 'standby',
          'ERROR'
        );
      } finally {
        isFallbackTurnInFlightRef.current = false;
      }
    },
    [enqueuePcm24kChunk, ensureAudioEngine, playWavBase64, setStatesSync]
  );

  // Start fallback MediaRecorder ONLY when WebSocket is genuinely unavailable (DEGRADED_FALLBACK)
  const startFallbackSpeechRecording = useCallback(() => {
    if (
      !micStreamRef.current ||
      isFallbackTurnInFlightRef.current ||
      (mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording')
    ) {
      return;
    }
    try {
      fallbackChunksRef.current = [];
      const recorder = new MediaRecorder(micStreamRef.current);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          fallbackChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const chunks = fallbackChunksRef.current;
        fallbackChunksRef.current = [];
        if (chunks.length === 0) return;

        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 1400) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          if (!dataUrl) return;
          const base64 = dataUrl.split(',')[1];
          if (base64) {
            sendTurnViaApi({
              audioBase64: base64,
              audioMimeType: blob.type || 'audio/webm',
            });
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
    } catch (e) {
      console.warn('MediaRecorder fallback start warning:', e);
    }
  }, [sendTurnViaApi]);

  const stopFallbackSpeechRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  // Connect to /live WebSocket
  const connectLiveWebSocket = useCallback(
    (autoGreet: boolean = false, isReconnect: boolean = false) => {
      const currentGen = generationRef.current;
      
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }

      setStatesSync(
        'connecting',
        isReconnect ? 'RECONNECTING' : 'CONNECTING_WS'
      );

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({
        voice: voiceIdRef.current,
        extendedThinking: String(extendedThinkingRef.current),
        autoGreet: String(autoGreet),
        reconnect: String(isReconnect),
        gen: String(currentGen),
      });
      if (sessionTokenRef.current) {
        params.set('token', sessionTokenRef.current);
      }

      const wsUrl = `${protocol}//${window.location.host}/live?${params.toString()}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const handshakeTimeout = setTimeout(() => {
        if (generationRef.current !== currentGen) return;
        if (ws.readyState !== WebSocket.OPEN) {
          try {
            ws.close();
          } catch {
            // ignore
          }
          setTransportMode('gemini-3.8-live-stream');
          setStatesSync('listening', 'DEGRADED_FALLBACK');
          setLiveCaption(
            'Gemini 3.8 Live Stream Active — Speak naturally at any time'
          );
        }
      }, 5500);

      ws.onopen = () => {
        if (generationRef.current !== currentGen) {
          ws.close();
          return;
        }
        setStatesSync('connecting', 'AUTHENTICATING_LIVE');
      };

      ws.onmessage = (event) => {
        if (generationRef.current !== currentGen) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected' || msg.type === 'liveReady') {
            clearTimeout(handshakeTimeout);
            setTransportMode('gemini-3.8-live-ws');
            if (typeof msg.sessionId === 'string') {
              setSessionId(msg.sessionId);
            }
            if (msg.businessState) {
              onStateSyncRef.current(msg.businessState);
            }
            setStatesSync('listening', 'LISTENING');
            setLiveCaption(
              'Gemini 3.8 Live Full-Duplex Active — Speak naturally at any time'
            );
            console.log(`[LIVE CLIENT READY] session=${msg.sessionId || 'active'} transport=gemini-3.8-live-ws`);
          }

          if (msg.type === 'interrupted' || msg.interrupted) {
            metricsRef.current.interruptions++;
            stopJarvisPlayback('barge_in');
          }

          if (msg.type === 'telemetry') {
            metricsRef.current.serverRxChunks = msg.serverRxChunks;
            metricsRef.current.serverRxBytes = msg.serverRxBytes;
            metricsRef.current.geminiTxChunks = msg.geminiTxChunks;
            metricsRef.current.geminiTxBytes = msg.geminiTxBytes;
            metricsRef.current.geminiRxChunks = msg.geminiRxChunks;
            metricsRef.current.geminiRxBytes = msg.geminiRxBytes;
          }

          if (msg.type === 'audio' && typeof msg.audio === 'string') {
            const pktTurnId =
              typeof msg.turnId === 'number' ? msg.turnId : undefined;
            const pktGen = typeof msg.gen === 'number' ? msg.gen : currentGen;
            enqueuePcm24kChunk(msg.audio, pktTurnId, pktGen);
          }

          if (msg.type === 'inputTranscription' && msg.text) {
            metricsRef.current.inputTranscriptEvents++;
            currentUserCaptionRef.current = (
              currentUserCaptionRef.current +
              ' ' +
              msg.text
            ).trim();
            setLiveCaption(`You: "${currentUserCaptionRef.current}"`);
          }

          if (msg.type === 'outputTranscription' && msg.text) {
            metricsRef.current.outputTranscriptEvents++;
            currentJarvisCaptionRef.current = (
              currentJarvisCaptionRef.current +
              ' ' +
              msg.text
            ).trim();
            setLiveCaption(currentJarvisCaptionRef.current);
          }

          if (msg.type === 'modelText' && msg.text) {
            currentJarvisCaptionRef.current = (
              currentJarvisCaptionRef.current +
              ' ' +
              msg.text
            ).trim();
            setLiveCaption(currentJarvisCaptionRef.current);
          }

          if (
            msg.type === 'stateSync' &&
            msg.businessState &&
            typeof msg.businessState === 'object'
          ) {
            onStateSyncRef.current(
              msg.businessState as EdcBusinessState,
              Array.isArray(msg.toolResults) ? msg.toolResults : undefined
            );
          }

          if (
            msg.type === 'navigate' &&
            typeof msg.view === 'string' &&
            onNavigateRef.current
          ) {
            onNavigateRef.current(msg.view);
          }

          if (msg.type === 'webSearchResults') {
            const wsPayload: WebSearchPayload = {
              query: String(msg.query || 'Live Web Search'),
              summary: String(msg.summary || ''),
              sources: Array.isArray(msg.sources)
                ? (msg.sources as WebSearchCitation[])
                : [],
              timestamp: formatNowTime(),
            };
            setLatestWebSearch(wsPayload);
            setTranscripts((prev) => [
              ...prev,
              {
                id: `ws-${Date.now()}`,
                timestamp: formatNowTime(),
                role: 'jarvis',
                voiceId: voiceIdRef.current,
                text: wsPayload.summary,
                webSearch: wsPayload,
              },
            ]);
          }

          if (msg.type === 'turnComplete') {
            metricsRef.current.turnCompleteEvents++;
            if (typeof msg.turnId === 'number') {
              activeTurnIdRef.current = msg.turnId;
              setActiveTurnId(msg.turnId);
            }
            if (currentUserCaptionRef.current) {
              const userSpoken = currentUserCaptionRef.current;
              currentUserCaptionRef.current = '';
              setTranscripts((prev) => [
                ...prev,
                {
                  id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  timestamp: formatNowTime(),
                  role: 'user',
                  text: userSpoken,
                },
              ]);
            }
            if (currentJarvisCaptionRef.current) {
              const jarvisSpoken = currentJarvisCaptionRef.current;
              currentJarvisCaptionRef.current = '';
              setTranscripts((prev) => [
                ...prev,
                {
                  id: `jrv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  timestamp: formatNowTime(),
                  role: 'jarvis',
                  voiceId: voiceIdRef.current,
                  latencyMs: lastLatencyMs,
                  text: jarvisSpoken,
                },
              ]);
            }
          }

          if (msg.type === 'error' && msg.error) {
            clearTimeout(handshakeTimeout);
            if (msg.category) {
              setLastErrorCategory(msg.category);
            }
            setTransportMode('gemini-3.8-live-stream');
            setStatesSync('listening', 'DEGRADED_FALLBACK');
          }
        } catch (e) {
          console.error('WS message parse error:', e);
        }
      };

      ws.onerror = () => {
        clearTimeout(handshakeTimeout);
        setLastErrorCategory('WEBSOCKET');
        setTransportMode('gemini-3.8-live-stream');
        if (isDuplexActiveRef.current) {
          setStatesSync('listening', 'DEGRADED_FALLBACK');
        }
      };

      ws.onclose = () => {
        clearTimeout(handshakeTimeout);
        if (isDuplexActiveRef.current) {
          setReconnectCount((c) => c + 1);
          setTransportMode('gemini-3.8-live-stream');
          setStatesSync('listening', 'DEGRADED_FALLBACK');
        }
      };
    },
    [enqueuePcm24kChunk, lastLatencyMs, setStatesSync, stopJarvisPlayback]
  );

  // Stop Full-Duplex Voice Session cleanly
  const stopFullDuplex = useCallback(() => {
    console.log('[LIVE SESSION] Atomic stop triggered.');
    
    // 1. Immediately invalidate current generation
    generationRef.current += 1;
    setGeneration(generationRef.current);
    
    isDuplexActiveRef.current = false;
    setIsDuplexActive(false);

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    stopFallbackSpeechRecording();
    stopJarvisPlayback('manual');

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      workletNodeRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // ignore
      }
      scriptProcessorRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    setInputLevel(0);
    setOutputLevel(0);
    setStatesSync('standby', 'DISCONNECTED');
    setLiveCaption('');
  }, [setStatesSync, stopFallbackSpeechRecording, stopJarvisPlayback]);

  // Start Full-Duplex Voice Session with AudioWorklet + Hardware AEC + Barge-In
  const startFullDuplex = useCallback(async () => {
    if (isDuplexActiveRef.current) {
      console.warn('[LIVE SESSION] Already active. Ignoring start request.');
      return;
    }
    
    // Stop any existing session first (atomic cleanup)
    stopFullDuplex();

    setErrorMessage(null);
    setLastErrorCategory(null);
    setStatesSync('connecting', 'INITIALIZING_AUDIO');

    // 1. Establish fresh generation
    generationRef.current += 1;
    const currentGen = generationRef.current;
    setGeneration(currentGen);
    console.log(`[LIVE SESSION] Starting generation: ${currentGen}`);

    // Reset metrics for new session
    metricsRef.current = {
      browserTxChunks: 0,
      browserTxBytes: 0,
      serverRxChunks: 0,
      serverRxBytes: 0,
      geminiTxChunks: 0,
      geminiTxBytes: 0,
      geminiRxChunks: 0,
      geminiRxBytes: 0,
      browserRxChunks: 0,
      browserRxBytes: 0,
      playbackChunks: 0,
      playbackBytes: 0,
      interruptions: 0,
      turnCompleteEvents: 0,
      inputTranscriptEvents: 0,
      outputTranscriptEvents: 0,
      lastMetricLog: Date.now(),
    };
    try {
      const ctx = await ensureAudioEngine();

      setStatesSync('connecting', 'REQUESTING_MIC');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      micStreamRef.current = stream;
      setMicPermission('granted');
      console.log(`[MIC] permission=granted active=${stream.active} tracks=${stream.getAudioTracks().length} sampleRate=${ctx.sampleRate}`);

      const micSource = ctx.createMediaStreamSource(stream);
      const inAnalyser = ctx.createAnalyser();
      inAnalyser.fftSize = 256;
      inAnalyser.smoothingTimeConstant = 0.5;
      inputAnalyserRef.current = inAnalyser;

      const silentSink = ctx.createGain();
      silentSink.gain.value = 0;
      silentSinkGainRef.current = silentSink;
      silentSink.connect(ctx.destination);

      micSource.connect(inAnalyser);

      // Process RMS + VAD + Barge-In from either AudioWorklet or ScriptProcessor
      const handleInputRmsAndPcm = (
        rms: number,
        pcm16Base64: string
      ) => {
        if (!isDuplexActiveRef.current || isMutedRef.current) return;

        const sens = vadSensitivityRef.current;
        const baseThreshold = Math.max(0.012, 0.048 - sens * 0.032);
        const timeSinceSpeakStart =
          performance.now() - jarvisSpeakStartTimeRef.current;
        const activeThreshold = isJarvisSpeakingRef.current
          ? Math.max(0.048, baseThreshold * 2.8)
          : baseThreshold;

        const isSpeechFrame = rms > activeThreshold;

        if (isSpeechFrame) {
          consecutiveSpeechFramesRef.current += 1;
          silenceFramesRef.current = 0;

          if (
            isJarvisSpeakingRef.current &&
            timeSinceSpeakStart > 420 &&
            consecutiveSpeechFramesRef.current >= 4
          ) {
            stopJarvisPlayback('barge_in');
          } else if (
            !isJarvisSpeakingRef.current &&
            consecutiveSpeechFramesRef.current >= 2 &&
            voiceStateRef.current !== 'user_speaking'
          ) {
            turnStartTimestampRef.current = performance.now();
            setStatesSync('user_speaking', 'USER_SPEAKING');
            // ONLY start MediaRecorder fallback when WebSocket is NOT open
            if (
              !wsRef.current ||
              wsRef.current.readyState !== WebSocket.OPEN
            ) {
              startFallbackSpeechRecording();
            }
          }
        } else {
          silenceFramesRef.current += 1;
          if (silenceFramesRef.current > 2) {
            consecutiveSpeechFramesRef.current = 0;
          }

          // When user finishes speaking (~650ms of silence)
          if (
            voiceStateRef.current === 'user_speaking' &&
            silenceFramesRef.current === 14
          ) {
            if (
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN
            ) {
              // WebSocket is authoritative — do NOT fire duplicate /api/jarvis/turn!
              setStatesSync('thinking', 'THINKING');
            } else {
              stopFallbackSpeechRecording();
            }
          }
        }

        // Stream 16kHz PCM to Gemini 3.8 Live WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          metricsRef.current.browserTxChunks++;
          const physicalBytes = Math.floor((pcm16Base64.length * 3) / 4);
          metricsRef.current.browserTxBytes += physicalBytes;

          if (metricsRef.current.browserTxChunks % 50 === 1) {
            console.log(
              `[LIVE AUDIO TX] seq=${metricsRef.current.browserTxChunks} samples=640 bytes=${physicalBytes} rate=16000`
            );
          }
          logClientMetrics();

          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              audio: pcm16Base64,
              seq: metricsRef.current.browserTxChunks,
              gen: generationRef.current,
              mimeType: 'audio/pcm;rate=16000',
            })
          );
        }
      };

      // Primary path: Dedicated AudioWorklet processor off the main UI thread
      let workletAttached = false;
      if (ctx.audioWorklet) {
        try {
          const workletUrl = `/audio-capture-worklet.js?v=${Date.now()}`;
          console.log(`[AudioEngine] Loading AudioWorklet module: ${workletUrl}`);
          await ctx.audioWorklet.addModule(workletUrl);
          
          console.log('[AudioEngine] Module loaded, creating AudioWorkletNode: jarvis-pcm-capture-processor');
          const workletNode = new AudioWorkletNode(
            ctx,
            'jarvis-pcm-capture-processor'
          );
          workletNodeRef.current = workletNode;

          workletNode.port.onmessage = (evt) => {
            if (evt.data?.type === 'pcm16' && evt.data.buffer) {
              const b64 = int16ArrayToBase64(evt.data.buffer);
              handleInputRmsAndPcm(Number(evt.data.rms || 0), b64);
            }
          };

          inAnalyser.connect(workletNode);
          workletNode.connect(silentSink);
          workletAttached = true;
          console.log('[AudioEngine] AudioWorklet successfully attached');
        } catch (workletErr) {
          console.error(
            'AUDIO_WORKLET_LOAD_FAILED: Module failed to load or processor name is invalid.',
            workletErr
          );
          setErrorMessage(`AUDIO_WORKLET_LOAD_FAILED: ${workletErr instanceof Error ? workletErr.message : String(workletErr)}`);
          setLastErrorCategory('AUDIO_WORKLET');
        }
      }

      if (!workletAttached) {
        console.warn('[AudioEngine] Falling back to ScriptProcessorNode');
        const processor = ctx.createScriptProcessor(2048, 1, 1);
        scriptProcessorRef.current = processor;
        inAnalyser.connect(processor);
        processor.connect(silentSink);

        processor.onaudioprocess = (audioEvent) => {
          if (!isDuplexActiveRef.current || isMutedRef.current) return;
          const inputChannel = audioEvent.inputBuffer.getChannelData(0);
          let sumSq = 0;
          for (let i = 0; i < inputChannel.length; i++) {
            sumSq += inputChannel[i] * inputChannel[i];
          }
          const rms = Math.sqrt(sumSq / inputChannel.length);
          const pcm16k = downsampleTo16k(
            inputChannel,
            audioEvent.inputBuffer.sampleRate
          );
          const base64Audio = float32ToPcm16Base64(pcm16k);
          handleInputRmsAndPcm(rms, base64Audio);
        };
      }

      // Start 60fps HUD visualizer loop
      const inBytes = new Uint8Array(inAnalyser.frequencyBinCount);
      const updateMeters = () => {
        if (!isDuplexActiveRef.current) return;
        if (inputAnalyserRef.current && !isMutedRef.current) {
          inputAnalyserRef.current.getByteFrequencyData(inBytes);
          let sum = 0;
          for (let i = 0; i < inBytes.length; i++) sum += inBytes[i];
          const avg = sum / (inBytes.length * 255);
          setInputLevel(Math.min(1, avg * 2.4));
        } else {
          setInputLevel(0);
        }

        if (outputAnalyserRef.current && isJarvisSpeakingRef.current) {
          const outBytes = new Uint8Array(
            outputAnalyserRef.current.frequencyBinCount
          );
          outputAnalyserRef.current.getByteFrequencyData(outBytes);
          let sum = 0;
          for (let i = 0; i < outBytes.length; i++) sum += outBytes[i];
          const avg = sum / (outBytes.length * 255);
          setOutputLevel(Math.min(1, Math.max(0.18, avg * 2.6)));
        } else {
          setOutputLevel(0);
        }

        rafIdRef.current = requestAnimationFrame(updateMeters);
      };

      isDuplexActiveRef.current = true;
      setIsDuplexActive(true);
      rafIdRef.current = requestAnimationFrame(updateMeters);

      connectLiveWebSocket(true, false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone access denied. Check browser permissions.';
      setErrorMessage(msg);
      setLastErrorCategory('MIC_PERMISSION');
      setMicPermission('denied');
      setStatesSync('standby', 'ERROR');
      isDuplexActiveRef.current = false;
      setIsDuplexActive(false);
    }
  }, [
    connectLiveWebSocket,
    ensureAudioEngine,
    setStatesSync,
    startFallbackSpeechRecording,
    stopFallbackSpeechRecording,
    stopFullDuplex,
    stopJarvisPlayback,
  ]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // Send a text command and receive instant spoken response + authoritative tool execution
  const sendTextDirective = useCallback(
    async (text: string, options?: { forceWebSearch?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      await ensureAudioEngine();
      stopJarvisPlayback('manual');
      turnStartTimestampRef.current = performance.now();

      setTranscripts((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          timestamp: formatNowTime(),
          role: 'user',
          text: trimmed,
        },
      ]);

      await sendTurnViaApi({
        prompt: trimmed,
        forceWebSearch: options?.forceWebSearch,
      });
    },
    [ensureAudioEngine, sendTurnViaApi, stopJarvisPlayback]
  );

  // Speak arbitrary text out loud (Voice Persona Audition / Protocol Dossier Readout)
  const speakTextOutLoud = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await ensureAudioEngine();
      stopJarvisPlayback('manual');
      setStatesSync('thinking', 'THINKING');
      setLiveCaption(trimmed);
      await sendTurnViaApi({ prompt: trimmed, ttsOnly: true });
    },
    [ensureAudioEngine, sendTurnViaApi, setStatesSync, stopJarvisPlayback]
  );

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (wsRef.current) wsRef.current.close();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const diagnostics: VoiceDiagnosticsTelemetry = {
    transportMode: isDuplexActive ? transportMode : 'standby',
    transportState,
    sessionId,
    generation,
    activeTurnId,
    micPermission,
    micState: isDuplexActive ? (isMuted ? 'INACTIVE' : 'ACTIVE') : 'UNKNOWN',
    sampleRateHz: telemetry.sampleRateHz || 0,
    outboundSampleRate: 16000,
    inboundSampleRate: 24000,
    browserTxChunks: telemetry.browserTxChunks || 0,
    browserTxBytes: telemetry.browserTxBytes || 0,
    serverRxChunks: telemetry.serverRxChunks || 0,
    serverRxBytes: telemetry.serverRxBytes || 0,
    geminiTxChunks: telemetry.geminiTxChunks || 0,
    geminiTxBytes: telemetry.geminiTxBytes || 0,
    geminiRxChunks: telemetry.geminiRxChunks || 0,
    geminiRxBytes: telemetry.geminiRxBytes || 0,
    browserRxChunks: telemetry.browserRxChunks || 0,
    browserRxBytes: telemetry.browserRxBytes || 0,
    playbackChunks: telemetry.playbackChunks || 0,
    playbackBytes: telemetry.playbackBytes || 0,
    inputRms: Number(inputLevel.toFixed(3)),
    outputRms: Number(outputLevel.toFixed(3)),
    queueDepth: telemetry.queueDepth || 0,
    bargeInCount,
    droppedStalePackets,
    reconnectCount,
    lastTurnLatencyMs: lastLatencyMs,
    interruptions: telemetry.interruptions || 0,
    turnCompleteEvents: telemetry.turnCompleteEvents || 0,
    lastErrorCategory,
  };

  return {
    voiceState,
    transportState,
    isDuplexActive,
    isMuted,
    transportMode,
    bargeInCount,
    lastLatencyMs,
    inputLevel,
    outputLevel,
    liveCaption,
    errorMessage,
    latestWebSearch,
    transcripts,
    diagnostics,
    startFullDuplex,
    stopFullDuplex,
    toggleMute,
    stopJarvisPlayback,
    sendTextDirective,
    speakTextOutLoud,
    playWavBase64,
    runVoiceDiagnostics: async () => {
      console.log('[DIAGNOSTICS] Starting comprehensive voice self-test...');
      try {
        const ctx = await ensureAudioEngine();
        console.log(`[AUDIO CONTEXT] state=${ctx.state} sampleRate=${ctx.sampleRate}`);

        // STAGE A: Speaker Output Test (Local Sine Wave)
        console.log('[DIAGNOSTICS] STAGE A: Local Speaker Output (Beep)...');
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        if (masterGainRef.current) g.connect(masterGainRef.current);
        else g.connect(ctx.destination);
        
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        console.log('[DIAGNOSTICS] STAGE A PASS: Speaker Output Verified');

        // STAGE B: REST Fallback / TTS Test
        console.log('[DIAGNOSTICS] STAGE B: REST Fallback / TTS Test...');
        await sendTurnViaApi({ 
          prompt: 'Say exactly: "J.A.R.V.I.S. voice synthesis test successful."', 
          ttsOnly: true 
        });
        console.log('[DIAGNOSTICS] STAGE B PASS: Speech Synthesis Verified');

        // STAGE C: Gemini Live Text Directive Test (over WebSocket)
        console.log('[DIAGNOSTICS] STAGE C: Gemini Live WebSocket Directive...');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'text', 
            text: 'Live link test: acknowledge in one short sentence.' 
          }));
          console.log('[DIAGNOSTICS] STAGE C PASS: Live WebSocket Directive Sent');
        } else {
          console.log('[DIAGNOSTICS] STAGE C INFO: Live WebSocket connecting for full duplex...');
          await startFullDuplex();
        }

        // STAGE D: Microphone & Live Stream Check
        console.log('[DIAGNOSTICS] STAGE D: Microphone Audio Streaming Check...');
        if (micStreamRef.current && micStreamRef.current.active) {
          console.log('[DIAGNOSTICS] STAGE D PASS: Microphone is active and streaming 16kHz PCM.');
        } else {
          console.log('[DIAGNOSTICS] Engaging Full-Duplex Live Audio...');
          await startFullDuplex();
        }

      } catch (err) {
        console.error('[DIAGNOSTICS] Voice diagnostic failed:', err);
      }
    },
    playLocalBeep: async () => {
      try {
        const ctx = await ensureAudioEngine();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(masterGainRef.current || ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        console.log('[AUDIO TEST] Local beep played');
        setLiveCaption('Audio Test: Local beep played. If you heard this, your speakers are connected.');
      } catch (e) {
        console.error('[AUDIO TEST] Local beep failed:', e);
        setErrorMessage('Audio Test Failed: ' + (e instanceof Error ? e.message : String(e)));
      }
    },
    resumeAudioContext: async () => {
      try {
        const ctx = await ensureAudioEngine();
        await ctx.resume();
        console.log('[AUDIO TEST] Manual context resume, state:', ctx.state);
        setLiveCaption(`Audio Context Resumed: ${ctx.state}`);
      } catch (e) {
        console.error('[AUDIO TEST] Resume failed:', e);
      }
    },
  };
}
