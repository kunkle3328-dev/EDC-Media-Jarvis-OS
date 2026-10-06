'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  EdcBusinessState,
  EXECUTIVE_PROTOCOLS,
  ExecutiveProtocolId,
  INITIAL_EDC_BUSINESS_STATE,
  OperatingScope,
  ToolExecutionResult,
  VOICE_PERSONAS,
  VoicePersonaId,
} from '@/lib/edc-os-config';
import {
  AuthenticatedContext,
  ExecutiveRole,
} from '@/lib/security/auth-and-permissions';
import { jarvisJsonRequest } from '@/lib/client-api';
import { useJarvisLive } from '@/hooks/use-jarvis-live';
import { JarvisHologramCore } from '@/components/jarvis-hologram-core';
import { StrategicProtocolPanel } from '@/components/strategic-protocol-panel';
import { EdcBusinessModules } from '@/components/edc-business-modules';
import { RevenueCommandCenter } from '@/components/revenue-command-center';
import { CeoMode } from '@/components/ceo-mode';
import { EdcOperationsHub } from '@/components/edc-operations-hub';
import { EdcGovernanceAndAutonomy } from '@/components/edc-governance-and-autonomy';
import { JarvisVoiceDiagnostics } from '@/components/jarvis-voice-diagnostics';
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Volume2,
  Send,
  Square,
  Cpu,
  CheckSquare,
  Briefcase,
  Bot,
  Compass,
  TrendingUp,
  Calendar,
  Users,
  Globe,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Bell,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type WorkspaceView =
  | 'command'
  | 'operations'
  | 'ecosystem'
  | 'agents'
  | 'strategy'
  | 'economics'
  | 'governance'
  | 'revenue'
  | 'ceo';

export default function EdcJarvisOperatingSystemPage() {
  const [activeView, setActiveView] = useState<WorkspaceView>('command');
  const [selectedVoiceId, setSelectedVoiceId] =
    useState<VoicePersonaId>('Charon');
  const [extendedThinking, setExtendedThinking] = useState<boolean>(false);
  const [vadSensitivity, setVadSensitivity] = useState<number>(0.62);
  const [selectedProtocol, setSelectedProtocol] =
    useState<ExecutiveProtocolId>('VALIDATE');
  const [businessState, setBusinessState] = useState<EdcBusinessState>(
    INITIAL_EDC_BUSINESS_STATE
  );
  const [authContext, setAuthContext] = useState<AuthenticatedContext | null>(
    null
  );
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState<string>('');
  const [forceWebSearch, setForceWebSearch] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);

  const activePersona =
    VOICE_PERSONAS.find((v) => v.id === selectedVoiceId) || VOICE_PERSONAS[0];

  // Hydrate authoritative persistent database state on mount
  useEffect(() => {
    let cancelled = false;
    async function hydrateAuthoritativeState() {
      try {
        const data = await jarvisJsonRequest<{
          ok?: boolean;
          businessState?: EdcBusinessState;
          authContext?: AuthenticatedContext;
        }>('/api/jarvis/state', {
          method: 'GET',
        });
        if (!cancelled && data.ok && data.businessState) {
          setBusinessState(data.businessState);
          if (data.authContext) {
            setAuthContext(data.authContext);
          }
        }
      } catch (err) {
        console.warn('Initial state hydration warning:', err);
      }
    }
    hydrateAuthoritativeState();
    return () => {
      cancelled = true;
    };
  }, []);

  // Authoritative state sync callback invoked whenever /live WebSocket or /api/jarvis/turn executes tools
  const handleAuthoritativeStateSync = useCallback(
    (
      nextState: EdcBusinessState,
      executedResults?: ToolExecutionResult[]
    ) => {
      setBusinessState(nextState);
      if (executedResults && executedResults.length > 0) {
        const first = executedResults[0];
        if (first.requiresApproval) {
          setStatusBanner({
            type: 'warning',
            text: `APPROVAL REQUIRED: ${first.message} (Audit #${first.auditId || 'logged'})`,
          });
        } else if (!first.success) {
          setStatusBanner({
            type: 'error',
            text: `TOOL EXECUTION FAILED (${first.toolName}): ${first.message}`,
          });
        } else {
          setStatusBanner({
            type: 'success',
            text: `VERIFIED PERSISTENCE (${first.toolName}): ${first.message}`,
          });
        }
      }
    },
    []
  );

  const handleNavigateWorkspace = useCallback((view: string) => {
    const clean = view.toLowerCase() as WorkspaceView;
    if (
      [
        'command',
        'operations',
        'ecosystem',
        'agents',
        'strategy',
        'economics',
        'governance',
        'revenue',
        'ceo',
      ].includes(clean)
    ) {
      setActiveView(clean);
    }
  }, []);

  // Execute any tool call through the authoritative /api/jarvis/state gateway
  const executeAuthoritativeTool = useCallback(
    async (
      toolName: string,
      args: Record<string, unknown>
    ): Promise<ToolExecutionResult | null> => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionToken) {
          headers.Authorization = `Bearer ${sessionToken}`;
        }
        const data = await jarvisJsonRequest<{
          ok?: boolean;
          businessState?: EdcBusinessState;
          navigatedView?: string;
          toolResult?: ToolExecutionResult;
        }>('/api/jarvis/state', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            operation: 'tool',
            toolName,
            args,
          }),
        });
        if (data.businessState) {
          setBusinessState(data.businessState);
        }
        if (data.navigatedView) {
          handleNavigateWorkspace(data.navigatedView);
        }
        if (data.toolResult) {
          const tr = data.toolResult;
          if (tr.requiresApproval) {
            setStatusBanner({
              type: 'warning',
              text: `QUEUED IN APPROVAL CENTER: ${tr.message}`,
            });
          } else if (!tr.success) {
            setStatusBanner({
              type: 'error',
              text: `DENIED / FAILED (${tr.toolName}): ${tr.message}`,
            });
          } else {
            setStatusBanner({
              type: 'success',
              text: `PERSISTED (${tr.toolName}): ${tr.message}`,
            });
          }
          return tr;
        }
        return null;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to execute tool';
        setStatusBanner({
          type: 'error',
          text: msg,
        });
        return null;
      }
    },
    [handleNavigateWorkspace, sessionToken]
  );

  const handleResolveApproval = useCallback(
    async (
      approvalId: string,
      decision: 'APPROVED' | 'DENIED' | 'DEFERRED'
    ) => {
      // Optimistic status update so clicking Approve/Deny responds immediately
      setBusinessState((prev) => ({
        ...prev,
        approvals: prev.approvals.map((a) =>
          a.id === approvalId ? { ...a, status: decision } : a
        ),
      }));
      try {
        const data = await jarvisJsonRequest<{
          ok?: boolean;
          businessState?: EdcBusinessState;
        }>('/api/jarvis/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'resolve_approval',
            approvalId,
            decision,
          }),
        });
        if (data.businessState) {
          setBusinessState(data.businessState);
          setStatusBanner({
            type: decision === 'APPROVED' ? 'success' : 'warning',
            text: `Approval #${approvalId} marked ${decision} and persisted in Audit Ledger.`,
          });
        }
      } catch (err) {
        console.error('Approval resolution error:', err);
      }
    },
    []
  );

  const handleSwitchRole = useCallback(async (role: ExecutiveRole) => {
    try {
      const data = await jarvisJsonRequest<{
        ok?: boolean;
        sessionToken?: string;
        authContext?: AuthenticatedContext;
        businessState?: EdcBusinessState;
      }>('/api/jarvis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'switch_role',
          role,
        }),
      });
      if (data.ok) {
        if (data.sessionToken) setSessionToken(data.sessionToken);
        if (data.authContext) setAuthContext(data.authContext);
        if (data.businessState) setBusinessState(data.businessState);
        setStatusBanner({
          type: 'success',
          text: `Session RBAC Role switched to ${role} (${data.authContext?.permissions?.join(', ') || ''}).`,
        });
      }
    } catch (err) {
      console.error('Role switch error:', err);
    }
  }, []);

  const handleSwitchScope = useCallback(async (scope: OperatingScope) => {
    setBusinessState((prev) => ({ ...prev, activeScope: scope }));
    try {
      const data = await jarvisJsonRequest<{
        ok?: boolean;
        businessState?: EdcBusinessState;
      }>('/api/jarvis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'switch_scope',
          scope,
        }),
      });
      if (data.businessState) {
        setBusinessState(data.businessState);
        setStatusBanner({
          type: 'success',
          text: `Operating Scope switched to ${scope} MODE.`,
        });
      }
    } catch (err) {
      console.error('Scope switch error:', err);
    }
  }, []);

  const {
    voiceState,
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
    runVoiceDiagnostics,
    playLocalBeep,
    resumeAudioContext,
  } = useJarvisLive({
    voiceId: selectedVoiceId,
    extendedThinking,
    vadSensitivity,
    businessState,
    sessionToken,
    onStateSync: handleAuthoritativeStateSync,
    onNavigate: handleNavigateWorkspace,
  });

  const handleCoreClick = () => {
    if (voiceState === 'jarvis_speaking') {
      stopJarvisPlayback('manual');
      return;
    }
    if (isDuplexActive) {
      stopFullDuplex();
    } else {
      startFullDuplex();
    }
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commandInput.trim();
    if (!text) return;
    setCommandInput('');
    await sendTextDirective(text, { forceWebSearch });
  };

  const handleRunVoiceTest = async () => {
    setIsDiagnosticRunning(true);
    await runVoiceDiagnostics();
    setIsDiagnosticRunning(false);
  };

  const handleJumpToProtocol = (
    protocolId: ExecutiveProtocolId,
    subject: string
  ) => {
    setSelectedProtocol(protocolId);
    setActiveView('strategy');
    sendTextDirective(`Execute the ${protocolId} protocol on: ${subject}`);
  };

  const pendingApprovalsCount = businessState.approvals.filter(
    (a) => a.status === 'PENDING'
  ).length;

  const navItems: Array<{
    id: WorkspaceView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'command', label: 'Command', icon: Cpu },
    { id: 'operations', label: 'Operations', icon: CheckSquare },
    { id: 'ecosystem', label: 'Ecosystem', icon: Briefcase },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'strategy', label: 'Strategy', icon: Compass },
    { id: 'economics', label: 'Economics', icon: TrendingUp },
    {
      id: 'governance',
      label: 'OS Core & Governance',
      icon: ShieldCheck,
      badge: pendingApprovalsCount,
    },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'ceo', label: 'CEO Mode', icon: ShieldCheck },
  ];

  const openTaskCount = businessState.tasks.filter(
    (t) => t.status !== 'Done'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#060911] text-slate-100 pb-20 md:pb-8">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 h-14 px-3 sm:px-6 lg:px-8 bg-[#060911]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 max-w-full">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('command');
          }}
          className="flex items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display whitespace-nowrap group-hover:text-sky-400 transition-colors">
            EDC Media
          </span>
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-medium text-slate-400">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  isActive
                    ? 'text-white border-sky-400 font-semibold'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-sm bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDiagnostics((v) => !v)}
            className={`min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              showDiagnostics
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="sm:inline hidden">{showDiagnostics ? 'Hide Logs' : 'Diagnostics'}</span>
            <span className="sm:hidden text-[11px] font-mono">{showDiagnostics ? 'Logs' : 'Diag'}</span>
          </button>

          {voiceState === 'jarvis_speaking' && (
            <button
              type="button"
              onClick={() => stopJarvisPlayback('manual')}
              className="min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-medium hover:bg-amber-500/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="sm:inline hidden">Interrupt Voice</span>
              <span className="sm:hidden text-[11px]">Stop</span>
            </button>
          )}

          <button
            type="button"
            onClick={isDuplexActive ? stopFullDuplex : startFullDuplex}
            className={`min-h-[34px] sm:min-h-[38px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 sm:gap-2 shadow-sm ${
              isDuplexActive
                ? 'bg-red-500/20 border border-red-400 text-red-200 hover:bg-red-500/30 shadow-red-500/10'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
            }`}
          >
            {isDuplexActive ? (
              <>
                <PhoneOff className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">End Duplex Link</span>
                <span className="sm:hidden">End</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Engage Live Duplex</span>
                <span className="sm:hidden">Live Duplex</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-28 md:pb-12 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
        {showDiagnostics && (
          <>
            <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
              <button
                type="button"
                onClick={playLocalBeep}
                className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded text-[10px] font-mono hover:bg-emerald-500/30 transition-colors cursor-pointer"
              >
                🔊 RUN LOCAL SOUND TEST (BEEP)
              </button>
              <button
                type="button"
                onClick={resumeAudioContext}
                className="px-3 py-1.5 bg-amber-500/20 border border-amber-400 text-amber-300 rounded text-[10px] font-mono hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                🔄 FORCE RESUME AUDIO CONTEXT
              </button>
            </div>
            <JarvisVoiceDiagnostics
              diagnostics={diagnostics}
              isTesting={isDiagnosticRunning}
              onRunTest={handleRunVoiceTest}
            />
          </>
        )}

        {/* Executive Operating Telemetry Ribbon */}
        <section className="bg-[#0B1222] border border-white/10 rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 font-mono">
              <span>J.A.R.V.I.S. OS</span>
              <span>·</span>
              <span
                className={
                  businessState.activeScope === 'PERSONAL'
                    ? 'text-emerald-400'
                    : 'text-sky-400'
                }
              >
                SCOPE: {businessState.activeScope}
              </span>
              <span>·</span>
              <span className="text-amber-300">
                ROLE: {authContext?.role || 'CEO_FOUNDER'}
              </span>
            </div>
          </div>
          
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-white font-display tracking-tight leading-snug">
            Autonomous Voice Command, Operations, Governance & Revenue OS
          </h1>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-x-4 sm:gap-y-2 pt-2.5 border-t border-white/5 text-[11px] sm:text-xs font-mono tabular-nums text-slate-300">
            <div className="bg-white/[0.02] sm:bg-transparent p-2 sm:p-0 rounded-lg">
              <span className="text-slate-400 block sm:inline">MRR: </span>
              <span className="text-white font-bold">
                ${businessState.economics.mrr.toLocaleString()}
              </span>
            </div>
            <div className="bg-white/[0.02] sm:bg-transparent p-2 sm:p-0 rounded-lg">
              <span className="text-slate-400 block sm:inline">MARGIN: </span>
              <span className="text-emerald-400 font-bold">
                {businessState.economics.grossMarginPct}%
              </span>
            </div>
            <div className="bg-white/[0.02] sm:bg-transparent p-2 sm:p-0 rounded-lg">
              <span className="text-slate-400 block sm:inline">TASKS: </span>
              <span className="text-sky-300 font-bold">{openTaskCount} Open</span>
            </div>
            <div className="bg-white/[0.02] sm:bg-transparent p-2 sm:p-0 rounded-lg">
              <span className="text-slate-400 block sm:inline">APPROVALS: </span>
              <button
                type="button"
                onClick={() => setActiveView('governance')}
                className={`font-bold underline cursor-pointer ${
                  pendingApprovalsCount > 0
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {pendingApprovalsCount} Pending
              </button>
            </div>
          </div>
        </section>

        {/* Live Authoritative Execution / Proactive Intelligence Status Bar */}
        {statusBanner ? (
          <div
            className={`px-4 py-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs font-mono ${
              statusBanner.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : statusBanner.type === 'warning'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : statusBanner.type === 'warning' ? (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        ) : (
          businessState.proactiveAlerts.length > 0 && (
            <div className="bg-[#0B1222] border border-sky-500/25 rounded-lg px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono text-[11px] uppercase text-amber-300 shrink-0">
                  PROACTIVE INTELLIGENCE:
                </span>
                <span className="text-slate-200 truncate">
                  <strong>{businessState.proactiveAlerts[0].title}</strong> —{' '}
                  {businessState.proactiveAlerts[0].description}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('governance')}
                className="font-mono text-[11px] text-sky-400 hover:text-sky-300 shrink-0"
              >
                Inspect OS Core & Approvals →
              </button>
            </div>
          )
        )}

        {/* Mobile Compact Voice Bar when viewing non-Command tabs on mobile */}
        {activeView !== 'command' && (
          <div className="lg:hidden bg-[#0B1222] border border-sky-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleCoreClick}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                  voiceState === 'jarvis_speaking'
                    ? 'bg-amber-500 text-slate-950'
                    : isDuplexActive
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-[#060911] border border-sky-400/50 text-sky-300'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {activePersona.codename} ({diagnostics.transportState})
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {liveCaption || 'Tap mic to speak or issue voice command'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('command')}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#060911] border border-white/15 text-xs font-mono text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              HUD Core
            </button>
          </div>
        )}

        {/* PRIMARY SPLIT GRID: Left = J.A.R.V.I.S. Live Voice & VAD Core | Right = Active Operating Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Holographic Acoustic Core + Voice Persona Calibration + True VAD Controls */}
          <div
            className={`lg:col-span-5 bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-5 ${
              activeView !== 'command' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Core Canvas */}
            <JarvisHologramCore
              voiceState={voiceState}
              isDuplexActive={isDuplexActive}
              isMuted={isMuted}
              inputLevel={inputLevel}
              outputLevel={outputLevel}
              vadSensitivity={vadSensitivity}
              persona={activePersona}
              bargeInCount={bargeInCount}
              lastLatencyMs={lastLatencyMs}
              onCoreClick={handleCoreClick}
            />

            {/* Live Caption / Subtitles Bar */}
            {liveCaption && (
              <div className="p-3 rounded-lg bg-[#060911] border border-white/10 text-xs text-slate-200 leading-relaxed">
                <span className="font-mono text-sky-400 mr-2">
                  [{activePersona.codename}]:
                </span>
                <span>{liveCaption}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-mono">
                {errorMessage}
              </div>
            )}

            {/* Primary Full-Duplex Action Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={isDuplexActive ? stopFullDuplex : startFullDuplex}
                className={`min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  isDuplexActive
                    ? 'bg-red-500/20 border border-red-400 text-red-200 hover:bg-red-500/30'
                    : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                }`}
              >
                {isDuplexActive ? (
                  <>
                    <PhoneOff className="w-4 h-4" />
                    <span>Stop Live Duplex</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Start Full Duplex</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={!isDuplexActive}
                onClick={toggleMute}
                className={`min-h-[46px] px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#060911] border-white/15 text-slate-200 hover:border-white/30'
                }`}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Unmute Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Mute Mic</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  voiceState === 'jarvis_speaking'
                    ? stopJarvisPlayback('manual')
                    : speakTextOutLoud(activePersona.sampleGreeting)
                }
                className="col-span-2 sm:col-span-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-[#060911] hover:bg-white/5 border border-white/15 text-xs font-medium text-amber-300 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                {voiceState === 'jarvis_speaking' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Barge-In Halt</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Test Voice Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Premium Human Voice Persona Selector */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  Premium Human Voice Persona
                </span>
                <span className="font-mono text-slate-400">
                  {activePersona.accentProfile}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {VOICE_PERSONAS.map((vp) => {
                  const selected = vp.id === selectedVoiceId;
                  return (
                    <button
                      key={vp.id}
                      type="button"
                      onClick={() => setSelectedVoiceId(vp.id)}
                      className={`min-h-[44px] px-2 py-2 rounded-lg border text-center transition-colors cursor-pointer ${
                        selected
                          ? 'bg-sky-500/20 border-sky-400 text-white'
                          : 'bg-[#060911] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">
                        {vp.id}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {vp.codename.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">
                  {activePersona.codename}
                </strong>{' '}
                ({activePersona.roleTitle}) — {activePersona.timbre}.
              </p>
            </div>

            {/* True Acoustic VAD & Extended Thinking Calibration */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div>
                <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                  <span className="text-slate-300">
                    Echo-Canceling VAD & Barge-In Gate
                  </span>
                  <span className="text-sky-300">
                    {Math.round(vadSensitivity * 100)}% Sensitivity
                  </span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={0.9}
                  step={0.05}
                  value={vadSensitivity}
                  onChange={(e) => setVadSensitivity(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Strict Echo Guard</span>
                  <span>Fast Conversational Barge-In</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs">
                  <div className="text-slate-200 font-medium">
                    Gemini 3.8 Live Extended Thinking
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Keep OFF for instant (~640ms) conversation; turn ON for deep
                    multi-step reasoning
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExtendedThinking((v) => !v)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                    extendedThinking
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#060911] border-white/10 text-slate-400'
                  }`}
                >
                  {extendedThinking ? 'EXTENDED THINKING' : 'INSTANT (~0.6s)'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Command Transcript & Tactical Modules */}
          <div className="lg:col-span-7 space-y-6">
            {activeView === 'command' && (
              <>
                {/* Live Bidirectional Voice & Directive Console */}
                <div className="bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white font-display">
                        01. Instant Bidirectional Voice & Command Stream
                      </h2>
                      <p className="text-xs text-slate-400">
                        Speak naturally or tap a directive below—J.A.R.V.I.S.
                        executes verified tools against the persistent database
                        and responds out loud.
                      </p>
                    </div>
                    <div className="text-xs font-mono text-emerald-400">
                      {transportMode === 'gemini-3.8-live-ws'
                        ? `LIVE DUPLEX (${diagnostics.transportState})`
                        : `LIVE STREAM (${diagnostics.transportState})`}
                    </div>
                  </div>

                  {/* Quick Voice/Text Tactical Directives */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        text: 'Search the live web for B2B AI voice agent pricing benchmarks and enterprise SaaS multiples in 2026.',
                        web: true,
                      },
                      {
                        text: 'Build an executive plan to reach $100,000 MRR and assign tasks to VANGUARD-01 and SENTINEL-CFO.',
                        web: false,
                      },
                      {
                        text: 'Send a binding enterprise contract to Northstar Logistics for $54,000 ACV.',
                        web: false,
                      },
                      {
                        text: 'Run the Enterprise Client Acquisition workflow on Northstar Logistics.',
                        web: false,
                      },
                    ].map((item) => (
                      <button
                        key={item.text}
                        type="button"
                        onClick={() =>
                          sendTextDirective(item.text, {
                            forceWebSearch: item.web,
                          })
                        }
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-sky-500/15 border border-white/10 hover:border-sky-400/40 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5"
                      >
                        {item.web && (
                          <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        )}
                        <span>“{item.text}”</span>
                      </button>
                    ))}
                  </div>

                  {/* Latest Live Google Search Grounding Banner */}
                  {latestWebSearch && (
                    <div className="p-3.5 rounded-xl bg-[#060911] border border-sky-400/35 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-sky-300">
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            LIVE GOOGLE SEARCH GROUNDING: “
                            {latestWebSearch.query}”
                          </span>
                        </span>
                        <span>{latestWebSearch.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {latestWebSearch.summary}
                      </p>
                      {latestWebSearch.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {latestWebSearch.sources.map((src) => (
                            <a
                              key={src.uri}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0B1222] border border-white/10 hover:border-sky-400/50 text-[11px] text-sky-300 hover:text-sky-200 transition-colors"
                            >
                              <span className="truncate max-w-[200px]">
                                {src.title}
                              </span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcript Log with Verified Tool Execution Receipts */}
                  <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                    {transcripts.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3.5 rounded-xl border text-sm leading-relaxed ${
                          entry.role === 'user'
                            ? 'bg-[#060911] border-white/10 text-slate-200 ml-6'
                            : entry.role === 'system'
                            ? 'bg-sky-500/10 border-sky-400/30 text-sky-200 font-mono text-xs'
                            : 'bg-[#0D162B] border-white/10 text-slate-100 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                          <span>
                            {entry.role === 'user'
                              ? 'EXECUTIVE (YOU)'
                              : entry.role === 'system'
                              ? 'AUTONOMOUS TOOL EXECUTION'
                              : `${activePersona.codename} (${
                                  entry.voiceId || selectedVoiceId
                                })`}
                          </span>
                          <span>{entry.timestamp}</span>
                        </div>
                        <p>{entry.text}</p>

                        {/* Authoritative Tool Execution Receipts */}
                        {entry.toolResults && entry.toolResults.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                            {entry.toolResults.map((tr) => (
                              <div
                                key={tr.executionId}
                                className={`text-xs font-mono flex flex-wrap items-center justify-between gap-2 px-2 py-1 rounded ${
                                  tr.requiresApproval
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : tr.success
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                <span>
                                  {tr.requiresApproval
                                    ? `[QUEUED FOR APPROVAL] ${tr.toolName}: ${tr.message}`
                                    : tr.success
                                    ? `[VERIFIED DB WRITE] ${tr.toolName}: ${tr.message}`
                                    : `[FAILED] ${tr.toolName}: ${tr.message}`}
                                </span>
                                {tr.auditId && (
                                  <span className="text-[10px] opacity-80">
                                    Audit: {tr.auditId}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {entry.webSearch &&
                          entry.webSearch.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                              <div className="text-[11px] font-mono text-sky-300 flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <span>Grounded Web Sources:</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {entry.webSearch.sources.map((src) => (
                                  <a
                                    key={src.uri}
                                    href={src.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#060911] border border-white/10 hover:border-sky-400/50 text-[11px] text-slate-300 hover:text-sky-200"
                                  >
                                    <span className="truncate max-w-[180px]">
                                      {src.title}
                                    </span>
                                    <ExternalLink className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>

                  {/* Direct Text/Voice Input Form with Live Web Search Toggle */}
                  <form
                    onSubmit={handleCommandSubmit}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2"
                  >
                    <input
                      type="text"
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      placeholder="Ask Jarvis to search the live web, build an executive plan, run a workflow, or manage tasks..."
                      className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#060911] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForceWebSearch((v) => !v)}
                        className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          forceWebSearch
                            ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                            : 'bg-[#060911] border-white/15 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span>
                          {forceWebSearch ? 'Web Search: ON' : 'Web Search'}
                        </span>
                      </button>

                      <button
                        type="submit"
                        className="min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Send className="w-4 h-4" />
                        <span>Speak Reply</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Live Snapshot of Tasks, Calendar & Client Contacts right inside Command Center */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tasks Snapshot Card */}
                  <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-sky-300 mb-2">
                        <span className="flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>PRIORITY TASKS</span>
                        </span>
                        <span>{openTaskCount} OPEN</span>
                      </div>
                      <div className="space-y-2">
                        {businessState.tasks
                          .filter((t) => t.status !== 'Done')
                          .slice(0, 3)
                          .map((t) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-lg bg-[#060911] border border-white/10 text-xs space-y-1"
                            >
                              <div className="flex justify-between font-mono text-[10px] text-slate-400">
                                <span
                                  className={
                                    t.priority === 'Critical'
                                      ? 'text-red-400'
                                      : 'text-amber-300'
                                  }
                                >
                                  {t.priority}
                                </span>
                                <span>{t.dueDate}</span>
                              </div>
                              <p className="text-slate-200 line-clamp-2 font-medium">
                                {t.title}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('operations')}
                      className="w-full min-h-[38px] rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-mono text-sky-300 cursor-pointer"
                    >
                      Manage All Tasks →
                    </button>
                  </div>

                  {/* Calendar Snapshot Card */}
                  <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>UPCOMING AGENDA</span>
                        </span>
                        <span>{businessState.calendar.length} EVENTS</span>
                      </div>
                      <div className="space-y-2">
                        {businessState.calendar.slice(0, 3).map((evt) => (
                          <div
                            key={evt.id}
                            className="p-2.5 rounded-lg bg-[#060911] border border-white/10 text-xs space-y-1"
                          >
                            <div className="flex justify-between font-mono text-[10px] text-slate-400">
                              <span className="text-sky-300">
                                {evt.date} · {evt.startTime}
                              </span>
                              <span>{evt.durationMins}m</span>
                            </div>
                            <p className="text-slate-200 line-clamp-2 font-medium">
                              {evt.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('operations')}
                      className="w-full min-h-[38px] rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-mono text-emerald-400 cursor-pointer"
                    >
                      Open Calendar & Deadlines →
                    </button>
                  </div>

                  {/* Contacts Snapshot Card */}
                  <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-amber-300 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>CLIENT CRM</span>
                        </span>
                        <span>{businessState.contacts.length} ACCOUNTS</span>
                      </div>
                      <div className="space-y-2">
                        {businessState.contacts.slice(0, 3).map((cnt) => (
                          <div
                            key={cnt.id}
                            className="p-2.5 rounded-lg bg-[#060911] border border-white/10 text-xs space-y-1"
                          >
                            <div className="flex justify-between font-mono text-[10px] text-slate-400">
                              <span className="text-white font-semibold">
                                {cnt.name}
                              </span>
                              <span className="text-emerald-400">
                                ${cnt.mrrValue.toLocaleString()}/mo
                              </span>
                            </div>
                            <p className="text-slate-400 truncate">
                              {cnt.role} · {cnt.company}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('operations')}
                      className="w-full min-h-[38px] rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-mono text-amber-300 cursor-pointer"
                    >
                      Open Client CRM →
                    </button>
                  </div>
                </div>

                {/* Fast-Launch Executive Protocols Bar */}
                <div className="bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white font-display">
                        02. EDC Media Strategic Protocol Triggers
                      </h2>
                      <p className="text-xs text-slate-400">
                        Launch an 8-dimension stress-test protocol with spoken
                        executive verdict.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('strategy')}
                      className="text-xs font-mono text-sky-300 hover:text-sky-200 cursor-pointer whitespace-nowrap"
                    >
                      Open Full Matrix →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {EXECUTIVE_PROTOCOLS.map((proto) => (
                      <button
                        key={proto.id}
                        type="button"
                        onClick={() => {
                          setSelectedProtocol(proto.id);
                          setActiveView('strategy');
                        }}
                        className="min-h-[44px] p-2.5 rounded-lg bg-[#060911] hover:bg-sky-500/15 border border-white/10 hover:border-sky-400/40 text-left transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-mono font-semibold text-sky-300">
                          {proto.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {proto.tagline}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeView === 'operations' && (
              <EdcOperationsHub
                tasks={businessState.tasks}
                calendar={businessState.calendar}
                contacts={businessState.contacts}
                onCreateTask={(newTask) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    tasks: [newTask, ...prev.tasks],
                  }));
                  executeAuthoritativeTool('manageTask', {
                    action: 'create',
                    title: newTask.title,
                    category: newTask.category,
                    priority: newTask.priority,
                    status: newTask.status,
                    dueDate: newTask.dueDate,
                    assignee: newTask.assignee,
                  });
                }}
                onUpdateTask={(updatedTask) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    tasks: prev.tasks.map((t) =>
                      t.id === updatedTask.id ? updatedTask : t
                    ),
                  }));
                  executeAuthoritativeTool('manageTask', {
                    action: 'update',
                    title: updatedTask.title,
                    category: updatedTask.category,
                    priority: updatedTask.priority,
                    status: updatedTask.status,
                    dueDate: updatedTask.dueDate,
                    assignee: updatedTask.assignee,
                  });
                }}
                onDeleteTask={(taskId) => {
                  const target = businessState.tasks.find(
                    (t) => t.id === taskId
                  );
                  setBusinessState((prev) => ({
                    ...prev,
                    tasks: prev.tasks.filter((t) => t.id !== taskId),
                  }));
                  if (target) {
                    executeAuthoritativeTool('manageTask', {
                      action: 'delete',
                      title: target.title,
                    });
                  }
                }}
                onCreateEvent={(newEvt) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    calendar: [newEvt, ...prev.calendar],
                  }));
                  executeAuthoritativeTool('manageCalendarEvent', {
                    action: 'schedule',
                    title: newEvt.title,
                    date: newEvt.date,
                    startTime: newEvt.startTime,
                    durationMins: newEvt.durationMins,
                    type: newEvt.type,
                    attendees: newEvt.attendees.join(', '),
                    notes: newEvt.notes,
                  });
                }}
                onUpdateEvent={(updatedEvt) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    calendar: prev.calendar.map((e) =>
                      e.id === updatedEvt.id ? updatedEvt : e
                    ),
                  }));
                  executeAuthoritativeTool('manageCalendarEvent', {
                    action:
                      updatedEvt.status === 'Completed'
                        ? 'complete'
                        : 'confirm',
                    title: updatedEvt.title,
                    date: updatedEvt.date,
                    startTime: updatedEvt.startTime,
                  });
                }}
                onDeleteEvent={(evtId) => {
                  const target = businessState.calendar.find(
                    (e) => e.id === evtId
                  );
                  setBusinessState((prev) => ({
                    ...prev,
                    calendar: prev.calendar.filter((e) => e.id !== evtId),
                  }));
                  if (target) {
                    executeAuthoritativeTool('manageCalendarEvent', {
                      action: 'cancel',
                      title: target.title,
                    });
                  }
                }}
                onCreateContact={(newCnt) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    contacts: [newCnt, ...prev.contacts],
                  }));
                  executeAuthoritativeTool('manageClientContact', {
                    action: 'create',
                    name: newCnt.name,
                    company: newCnt.company,
                    role: newCnt.role,
                    email: newCnt.email,
                    phone: newCnt.phone,
                    tier: newCnt.tier,
                    status: newCnt.status,
                    mrrValue: newCnt.mrrValue,
                    notes: newCnt.notes,
                  });
                }}
                onUpdateContact={(updatedCnt) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    contacts: prev.contacts.map((c) =>
                      c.id === updatedCnt.id ? updatedCnt : c
                    ),
                  }));
                  executeAuthoritativeTool('manageClientContact', {
                    action: 'update',
                    name: updatedCnt.name,
                    company: updatedCnt.company,
                    role: updatedCnt.role,
                    email: updatedCnt.email,
                    phone: updatedCnt.phone,
                    tier: updatedCnt.tier,
                    status: updatedCnt.status,
                    mrrValue: updatedCnt.mrrValue,
                    notes: updatedCnt.notes,
                  });
                }}
                onTriggerVoiceCommand={(cmd) => {
                  sendTextDirective(cmd);
                }}
              />
            )}

            {activeView === 'strategy' && (
              <StrategicProtocolPanel
                selectedProtocol={selectedProtocol}
                onSelectProtocol={setSelectedProtocol}
                voiceId={selectedVoiceId}
                businessState={businessState}
                onDirectiveLogged={(newDir) =>
                  setBusinessState((prev) => ({
                    ...prev,
                    directives: [newDir, ...prev.directives],
                  }))
                }
                onStateSync={(nextState) => setBusinessState(nextState)}
                onPlayAudioWav={playWavBase64}
                onSpeakText={speakTextOutLoud}
              />
            )}

            {(activeView === 'ecosystem' ||
              activeView === 'agents' ||
              activeView === 'economics') && (
              <EdcBusinessModules
                activeTab={activeView}
                businessState={businessState}
                onUpdateProduct={(updatedProd) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    products: prev.products.map((p) =>
                      p.id === updatedProd.id ? updatedProd : p
                    ),
                  }));
                  executeAuthoritativeTool('manageProductEcosystem', {
                    action: 'update',
                    productName: updatedProd.name,
                    category: updatedProd.category,
                    stage: updatedProd.stage,
                    mrr: updatedProd.mrr,
                    grossMarginPct: updatedProd.grossMarginPct,
                    arpu: updatedProd.arpu,
                    nextMilestone: updatedProd.nextMilestone,
                  });
                }}
                onCreateProduct={(newProd) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    products: [newProd, ...prev.products],
                  }));
                  executeAuthoritativeTool('manageProductEcosystem', {
                    action: 'create',
                    productName: newProd.name,
                    category: newProd.category,
                    stage: newProd.stage,
                    mrr: newProd.mrr,
                    grossMarginPct: newProd.grossMarginPct,
                    arpu: newProd.arpu,
                    nextMilestone: newProd.nextMilestone,
                  });
                }}
                onUpdateAgent={(updatedAgent) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    agents: prev.agents.map((a) =>
                      a.id === updatedAgent.id ? updatedAgent : a
                    ),
                  }));
                  executeAuthoritativeTool('controlAgentFleet', {
                    codename: updatedAgent.codename,
                    domain: updatedAgent.domain,
                    status: updatedAgent.status,
                    currentObjective: updatedAgent.currentObjective,
                  });
                }}
                onCreateAgent={(newAgent) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    agents: [newAgent, ...prev.agents],
                  }));
                  executeAuthoritativeTool('controlAgentFleet', {
                    codename: newAgent.codename,
                    domain: newAgent.domain,
                    status: newAgent.status,
                    currentObjective: newAgent.currentObjective,
                  });
                }}
                onUpdateDeal={(updatedDeal) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    deals: prev.deals.map((d) =>
                      d.id === updatedDeal.id ? updatedDeal : d
                    ),
                  }));
                  executeAuthoritativeTool('updateRevenueDeal', {
                    company: updatedDeal.company,
                    product: updatedDeal.product,
                    acv: updatedDeal.acv,
                    stage: updatedDeal.stage,
                    probabilityPct: updatedDeal.probabilityPct,
                    nextAction: updatedDeal.nextAction,
                  });
                }}
                onCreateDeal={(newDeal) => {
                  setBusinessState((prev) => ({
                    ...prev,
                    deals: [newDeal, ...prev.deals],
                  }));
                  executeAuthoritativeTool('updateRevenueDeal', {
                    company: newDeal.company,
                    product: newDeal.product,
                    acv: newDeal.acv,
                    stage: newDeal.stage,
                    probabilityPct: newDeal.probabilityPct,
                    nextAction: newDeal.nextAction,
                  });
                }}
                onTriggerVoiceCommand={(cmd) => {
                  sendTextDirective(cmd);
                }}
                onJumpToProtocol={handleJumpToProtocol}
              />
            )}

            {activeView === 'ceo' && (
              <CeoMode businessState={businessState} />
            )}

            {activeView === 'revenue' && (
              <RevenueCommandCenter
                businessState={businessState}
                onTriggerResearch={async (query) => {
                  setStatusBanner({ type: 'success', text: 'J.A.R.V.I.S. Opportunity Engine engaged. Scanning market sectors...' });
                  const result = await executeAuthoritativeTool('discoverOpportunity', {
                    marketSector: query,
                    focusArea: 'AI Voice & Autonomous Workflows',
                  });
                  if (result?.success) {
                    setStatusBanner({ type: 'success', text: `Intelligence capture successful: ${result.message}` });
                  }
                }}
              />
            )}

            {activeView === 'governance' && (
              <EdcGovernanceAndAutonomy
                businessState={businessState}
                authContext={authContext}
                diagnostics={diagnostics}
                onExecuteTool={executeAuthoritativeTool}
                onResolveApproval={handleResolveApproval}
                onSwitchRole={handleSwitchRole}
                onSwitchScope={handleSwitchScope}
                onVoicePrompt={(prompt) => sendTextDirective(prompt)}
              />
            )}
          </div>
        </div>
      </main>

      {/* MOBILE THUMB-ZONE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060911]/95 backdrop-blur-xl border-t border-white/10 pb-safe shadow-2xl"
      >
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-1 px-1.5 gap-1 w-full max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`flex-1 min-w-[54px] max-w-[76px] min-h-[50px] py-1.5 px-1 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer relative shrink-0 ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? 'text-sky-400 scale-110' : 'text-slate-400'
                    }`}
                  />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[8px] leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-1 whitespace-nowrap truncate max-w-[58px]">
                  {item.id === 'governance' ? 'OS Core' : item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-4 h-0.5 bg-sky-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
