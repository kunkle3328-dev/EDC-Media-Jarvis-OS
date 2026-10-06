'use client';

import React from 'react';
import { VoiceDiagnosticsTelemetry } from '@/lib/edc-os-config';
import { Activity, ShieldCheck, Zap, Mic, Speaker, Radio, Globe } from 'lucide-react';

interface JarvisVoiceDiagnosticsProps {
  diagnostics: VoiceDiagnosticsTelemetry;
  onRunTest: () => void;
  isTesting: boolean;
}

export function JarvisVoiceDiagnostics({
  diagnostics,
  onRunTest,
  isTesting,
}: JarvisVoiceDiagnosticsProps) {
  const getStatusColor = (val: string | null | boolean) => {
    if (!val || val === 'ERROR' || val === 'denied') return 'text-rose-500';
    if (val === 'standby' || val === 'unknown') return 'text-slate-500';
    return 'text-emerald-400';
  };

  const getStatusIcon = (val: string | null | boolean) => {
    if (!val || val === 'ERROR' || val === 'denied') return '❌';
    if (val === 'standby' || val === 'unknown') return '⚪';
    return '✅';
  };

  return (
    <div className="bg-[#0B1222]/90 border border-white/10 rounded-xl p-5 font-mono text-[11px] space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h3 className="text-sky-300 font-bold uppercase tracking-widest">
            Voice Diagnostics Engine
          </h3>
        </div>
        <button
          onClick={onRunTest}
          disabled={isTesting}
          className="px-3 py-1 bg-sky-500/20 border border-sky-400 text-sky-300 rounded hover:bg-sky-500/30 disabled:opacity-50 transition-colors"
        >
          {isTesting ? 'RUNNING TEST...' : 'TEST J.A.R.V.I.S. VOICE'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Mic className="w-3.5 h-3.5" />
            <span>MICROPHONE</span>
          </div>
          <span className={getStatusColor(diagnostics.micPermission)}>
            {getStatusIcon(diagnostics.micPermission)} {diagnostics.micPermission.toUpperCase()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUDIO CONTEXT</span>
          </div>
          <span className={getStatusColor(diagnostics.transportState !== 'DISCONNECTED')}>
            {getStatusIcon(diagnostics.transportState !== 'DISCONNECTED')} {diagnostics.transportState === 'ERROR' ? 'FAILED' : 'ACTIVE'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Zap className="w-3.5 h-3.5" />
            <span>WORKLET</span>
          </div>
          <span className={getStatusColor(diagnostics.lastErrorCategory !== 'AUDIO_WORKLET')}>
            {getStatusIcon(diagnostics.lastErrorCategory !== 'AUDIO_WORKLET')} {diagnostics.lastErrorCategory === 'AUDIO_WORKLET' ? 'FAILED' : 'LOADED'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5" />
            <span>WEBSOCKET</span>
          </div>
          <span className={getStatusColor(diagnostics.transportMode === 'gemini-3.8-live-ws')}>
            {getStatusIcon(diagnostics.transportMode === 'gemini-3.8-live-ws')} {diagnostics.transportMode === 'gemini-3.8-live-ws' ? 'CONNECTED' : 'STREAM'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Globe className="w-3.5 h-3.5" />
            <span>LIVE SESSION</span>
          </div>
          <span className={getStatusColor(diagnostics.sessionId !== 'standby')}>
            {getStatusIcon(diagnostics.sessionId !== 'standby')} {diagnostics.sessionId !== 'standby' ? 'READY' : 'IDLE'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-3.5 h-3.5" />
            <span>INPUT PCM</span>
          </div>
          <span className="text-sky-300">
            {diagnostics.inputRms > 0 ? 'STREAMING' : 'SILENT'} ({diagnostics.inputRms.toFixed(3)} RMS)
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Speaker className="w-3.5 h-3.5" />
            <span>SPEAKER OUTPUT</span>
          </div>
          <span className={getStatusColor(diagnostics.outputRms > 0)}>
             {diagnostics.outputRms.toFixed(3)} RMS
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Zap className="w-3.5 h-3.5" />
            <span>LATENCY (TTFA)</span>
          </div>
          <span className="text-amber-400 font-bold">
            {diagnostics.lastTurnLatencyMs}ms
          </span>
        </div>
      </div>

      <div className="bg-black/40 rounded p-3 text-[10px] space-y-2 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-slate-400 font-bold uppercase">Outbound Pipeline</div>
            <div className="flex justify-between">
              <span>MIC / BROWSER TX:</span>
              <span className="text-sky-300 font-bold">{diagnostics.browserTxChunks} chunks</span>
            </div>
            <div className="flex justify-between">
              <span>SERVER RX:</span>
              <span className="text-sky-300">{diagnostics.serverRxChunks} chunks</span>
            </div>
            <div className="flex justify-between">
              <span>GEMINI TX:</span>
              <span className="text-sky-300">{diagnostics.geminiTxChunks} chunks</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-slate-400 font-bold uppercase">Inbound Pipeline</div>
            <div className="flex justify-between">
              <span>GEMINI RX:</span>
              <span className="text-emerald-400">{diagnostics.geminiRxChunks} chunks</span>
            </div>
            <div className="flex justify-between">
              <span>BROWSER RX:</span>
              <span className="text-emerald-400 font-bold">{diagnostics.browserRxChunks} chunks</span>
            </div>
            <div className="flex justify-between">
              <span>PLAYBACK:</span>
              <span className="text-emerald-300 font-bold">{diagnostics.playbackChunks} chunks</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400 font-bold uppercase">Session Telemetry</div>
            <div className="flex justify-between">
              <span>GEMINI EVENTS:</span>
              <span className="text-amber-300">{diagnostics.turnCompleteEvents}</span>
            </div>
            <div className="flex justify-between">
              <span>INTERRUPTIONS:</span>
              <span className="text-rose-400">{diagnostics.interruptions}</span>
            </div>
            <div className="flex justify-between">
              <span>GENERATION:</span>
              <span className="text-slate-300">#{diagnostics.generation}</span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-white/5 text-slate-400 font-mono flex flex-wrap justify-between gap-2">
          <span>SESSION: {diagnostics.sessionId}</span>
          <span>MODE: {diagnostics.transportMode}</span>
          <span>STATE: {diagnostics.transportState}</span>
        </div>
      </div>
    </div>
  );
}
