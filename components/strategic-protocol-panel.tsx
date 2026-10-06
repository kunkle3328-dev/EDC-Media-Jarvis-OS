'use client';

import React, { useState } from 'react';
import {
  EdcBusinessState,
  EdcDirective,
  EXECUTIVE_PROTOCOLS,
  ExecutiveProtocolId,
  VoicePersonaId,
} from '@/lib/edc-os-config';
import { jarvisJsonRequest } from '@/lib/client-api';
import {
  Play,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  ShieldAlert,
  TrendingUp,
  Globe,
  ExternalLink,
} from 'lucide-react';

export interface ProtocolDossierResult {
  title: string;
  spokenBriefing: string;
  projectedImpactMetric: string;
  eightDimensions: {
    opportunity: string;
    competitive: string;
    customer: string;
    technical: string;
    economic: string;
    goToMarket: string;
    risk: string;
    scalability: string;
  };
  verdictMatrix: {
    whatIsStrong: string;
    whatIsWeak: string;
    whatIsMissing: string;
    whatShouldChange: string;
    whatShouldBeBuilt: string;
    whatShouldNotBeBuilt: string;
  };
  executiveConclusion: {
    decisionFramework: string;
    keyFactsAssumptions: string;
    recommendedNextMoves: string;
    buildExecutionPlan: string;
    businessModel: string;
    revenueLevers: string;
    risks: string;
    immediateNextAction: string;
  };
}

interface StrategicProtocolPanelProps {
  selectedProtocol: ExecutiveProtocolId;
  onSelectProtocol: (id: ExecutiveProtocolId) => void;
  voiceId: VoicePersonaId;
  businessState: EdcBusinessState;
  onDirectiveLogged: (directive: EdcDirective) => void;
  onStateSync?: (nextState: EdcBusinessState) => void;
  onPlayAudioWav: (wavBase64: string) => Promise<void>;
  onSpeakText: (text: string) => Promise<void>;
}

const INITIAL_SAMPLE_DOSSIER: ProtocolDossierResult = {
  title: 'EDC Media Autonomous Voice & Revenue OS — Full Commercial Stress-Test',
  spokenBriefing:
    'I have completed the eight-dimension validation for our vertical AI Voice and Pipeline Operating System. The unit economics are exceptionally strong at eighty-four percent gross margin with a two-month CAC payback, provided we enforce strict workflow lock-in and avoid building bespoke one-off agency wrappers.',
  projectedImpactMetric: '+$42,000 Net New MRR · 84.5% Gross Margin · 1.9 Mo Payback',
  eightDimensions: {
    opportunity:
      'High-ticket B2B service firms and multi-location operators lose 38% of inbound demand to slow response latency (>14 mins). Sub-second full-duplex voice qualification captures immediate pipeline.',
    competitive:
      'Commodity voice wrappers sell raw minutes with zero CRM state ownership. EDC Media differentiates by owning the end-to-end Market-to-Close autonomous workflow and attribution ledger.',
    customer:
      'Ideal Buyer: Managing Partners, CROs, and Founders generating $3M–$50M ARR with ACVs > $5,000 where 2 recovered deals per month pay for the entire annual platform fee.',
    technical:
      'Gemini 3.8 Live full-duplex audio paired with deterministic function-calling guardrails and automatic routing to Gemini 3.8 Flash for asynchronous CRM enrichment.',
    economic:
      'Platform Retainer ($2,500–$4,500/mo) + Autonomous Usage Tier. AI COGS averages $190/mo per tenant, yielding an 84.5% software gross margin.',
    goToMarket:
      'Interactive Live Voice Sandbox ("Audition Your AI CRO Live in 30 Seconds") embedded directly in outbound executive sequences.',
    risk:
      'Scope creep from custom agency requests. Mitigated by strict productized vertical templates and automated FORGE-CTO provisioning.',
    scalability:
      'Zero marginal human delivery hours after onboarding; reusable multi-tenant agent templates scale across 50+ enterprise accounts per engineer.',
  },
  verdictMatrix: {
    whatIsStrong:
      '84%+ gross margin structure, immediate ROI clarity for high-ACV B2B buyers, and deep workflow lock-in via CRM & calendar ownership.',
    whatIsWeak:
      'Current onboarding still requires manual prompt tuning for edge-case industry objections.',
    whatIsMissing:
      'Self-serve ROI telemetry digest emailed automatically every Monday morning to the client CFO.',
    whatShouldChange:
      'Eliminate custom per-client integration code; enforce standardized webhook and CRM adapters.',
    whatShouldBeBuilt:
      'Automated Monday CFO Value Digest + 1-Click Vertical Persona Cloner for MedTech, Legal, and Industrial B2B.',
    whatShouldNotBeBuilt:
      'Do NOT build a generic low-ticket ($49/mo) self-serve consumer voice wrapper—high churn and poor unit economics.',
  },
  executiveConclusion: {
    decisionFramework:
      'Prioritize initiatives that exceed 80% gross margin, achieve CAC payback under 3 months, and embed directly into daily revenue workflows.',
    keyFactsAssumptions:
      'Assumes average client ACV of $30K+ and <150 minutes/day of live duplex voice volume per tenant.',
    recommendedNextMoves:
      '1. Lock $3,500/mo floor pricing for Enterprise Workspaces. 2. Deploy VANGUARD-01 on our own inbound funnel. 3. Convert top 3 service retainers into annual software licenses.',
    buildExecutionPlan:
      'Phase 1: Standardized Tenant Config Schema. Phase 2: Gemini 3.8 Live Tool Graph for CRM + Calendar. Phase 3: Automated CFO ROI Attribution Dashboard.',
    businessModel:
      'Annual Platform Subscription ($30K–$54K ACV) + Usage Expansion above 2,500 autonomous agent runs/month.',
    revenueLevers:
      'Seat-free seat expansion via multi-department agent deployment (Sales -> Onboarding -> Account Expansion).',
    risks:
      'Model latency spikes or single-provider dependency; mitigated via dual-transport Live WebSocket + Hybrid VAD architecture.',
    immediateNextAction:
      'Authorize VANGUARD-01 to run live qualification on the 4 active Enterprise pipeline deals today.',
  },
};

export function StrategicProtocolPanel({
  selectedProtocol,
  onSelectProtocol,
  voiceId,
  businessState,
  onDirectiveLogged,
  onStateSync,
  onPlayAudioWav,
  onSpeakText,
}: StrategicProtocolPanelProps) {
  const activeSpec =
    EXECUTIVE_PROTOCOLS.find((p) => p.id === selectedProtocol) ||
    EXECUTIVE_PROTOCOLS[1];

  const [subjectOverrides, setSubjectOverrides] = useState<
    Partial<Record<ExecutiveProtocolId, string>>
  >({});
  const subjectInput =
    subjectOverrides[selectedProtocol] ?? activeSpec.defaultSubject;

  const [isRunning, setIsRunning] = useState(false);
  const [speakVerdict, setSpeakVerdict] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [webSources, setWebSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ProtocolDossierResult>(
    INITIAL_SAMPLE_DOSSIER
  );

  const handleSelectProtocol = (id: ExecutiveProtocolId) => {
    onSelectProtocol(id);
  };

  const handleRunProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setErrorMsg(null);

    try {
      const data = await jarvisJsonRequest<{
        error?: string;
        webSources?: Array<{ title: string; uri: string }>;
        businessState?: EdcBusinessState;
        dossier?: ProtocolDossierResult;
        audioWavBase64?: string | null;
      }>('/api/jarvis/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId: selectedProtocol,
          subject: subjectInput,
          voiceId,
          businessState,
          speakVerdict,
          useWebSearch,
        }),
      });

      if (data.error) {
        throw new Error(data.error);
      }

      if (Array.isArray(data.webSources)) {
        setWebSources(data.webSources);
      }

      if (data.businessState && onStateSync) {
        onStateSync(data.businessState);
      } else if (data.dossier) {
        setDossier(data.dossier);
        onDirectiveLogged({
          id: `dir-${Date.now()}`,
          timestamp: 'Just now',
          protocol: selectedProtocol,
          title: data.dossier.title,
          summary: data.dossier.spokenBriefing,
          impactMetric: data.dossier.projectedImpactMetric,
          status: 'Executed',
        });
      }

      if (data.dossier) {
        setDossier(data.dossier);
      }

      if (data.audioWavBase64) {
        await onPlayAudioWav(data.audioWavBase64);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error running protocol'
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white font-display">
            01. Executive Strategic Protocol Matrix
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Stress-test every initiative across Market, Product, AI, Agents, Distribution, Pricing, Retention, Profit, and Scale.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-400">
          <span>ACTIVE PROTOCOL: {selectedProtocol}</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>8-DIMENSION AUDIT</span>
        </div>
      </div>

      {/* 10 Protocol Selector Buttons (Interactive Segmented Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {EXECUTIVE_PROTOCOLS.map((proto) => {
          const isSelected = proto.id === selectedProtocol;
          return (
            <button
              key={proto.id}
              type="button"
              onClick={() => handleSelectProtocol(proto.id)}
              className={`min-h-[44px] px-3 py-2.5 rounded-lg text-left border transition-colors duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-sky-500/15 border-sky-400 text-white'
                  : 'bg-[#0B1222] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold tracking-wider whitespace-nowrap">
                  {proto.label}
                </span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {proto.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Protocol Input & Execution Bar */}
      <form
        onSubmit={handleRunProtocol}
        className="bg-[#0B1222] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Mandate: <strong className="text-slate-200">{activeSpec.tagline}</strong>
          </span>
          <span className="font-mono text-sky-300">{activeSpec.chainFocus}</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={subjectInput}
            onChange={(e) =>
              setSubjectOverrides((prev) => ({
                ...prev,
                [selectedProtocol]: e.target.value,
              }))
            }
            placeholder="Describe the product, market opportunity, pricing model, or workflow to stress-test..."
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#060911] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setUseWebSearch((v) => !v)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                useWebSearch
                  ? 'bg-sky-500/15 border-sky-400/50 text-sky-200'
                  : 'bg-[#060911] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{useWebSearch ? 'Live Web Search On' : 'Web Search Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSpeakVerdict((v) => !v)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                speakVerdict
                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                  : 'bg-[#060911] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{speakVerdict ? 'Voice Verdict On' : 'Muted Verdict'}</span>
            </button>

            <button
              type="submit"
              disabled={isRunning}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs tracking-wide flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isRunning
                  ? `Running ${selectedProtocol}...`
                  : `Execute ${selectedProtocol}`}
              </span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 font-mono">{errorMsg}</p>
        )}
      </form>

      {/* Dossier Output */}
      <div className="space-y-6">
        {/* Executive Verdict Header Card */}
        <div className="bg-[#0B1222] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">
              {dossier.title}
            </h3>
            <span className="text-xs font-mono tabular-nums text-emerald-300">
              {dossier.projectedImpactMetric}
            </span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">
            {dossier.spokenBriefing}
          </p>

          {webSources.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="text-[11px] font-mono text-sky-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>LIVE GOOGLE SEARCH GROUNDED SOURCES ({webSources.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {webSources.map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#060911] border border-white/10 hover:border-sky-400/50 text-xs text-slate-300 hover:text-sky-200 transition-colors"
                  >
                    <span className="truncate max-w-[220px]">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 text-sky-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between border-t border-white/5 text-xs text-slate-400">
            <span>
              Market → Problem → Product → AI → Agents → Distribution → Profit → Scale
            </span>
            <button
              type="button"
              onClick={() => onSpeakText(dossier.spokenBriefing)}
              className="text-sky-300 hover:text-sky-200 font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Speak Verdict Out Loud</span>
            </button>
          </div>
        </div>

        {/* What Is Strong / Weak / Missing / Should Change / Build / Not Build */}
        <div>
          <h3 className="text-base font-semibold text-white mb-3">
            02. Executive Diagnostic Verdict (Challenge & Leverage Filter)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                <span>WHAT IS STRONG</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {dossier.verdictMatrix.whatIsStrong}
              </p>
            </div>

            <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-amber-400">
                <span>WHAT IS WEAK</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {dossier.verdictMatrix.whatIsWeak}
              </p>
            </div>

            <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>WHAT IS MISSING</span>
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {dossier.verdictMatrix.whatIsMissing}
              </p>
            </div>

            <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-amber-300">
                <span>WHAT SHOULD CHANGE</span>
                <ArrowRight className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {dossier.verdictMatrix.whatShouldChange}
              </p>
            </div>

            <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
                <span>WHAT SHOULD BE BUILT</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {dossier.verdictMatrix.whatShouldBeBuilt}
              </p>
            </div>

            <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-red-400">
                <span>WHAT SHOULD NOT BE BUILT</span>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {dossier.verdictMatrix.whatShouldNotBeBuilt}
              </p>
            </div>
          </div>
        </div>

        {/* 8-Dimension Analysis Grid */}
        <div>
          <h3 className="text-base font-semibold text-white mb-3">
            03. Eight-Dimension Stress-Test Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Opportunity Analysis', val: dossier.eightDimensions.opportunity },
              { label: 'Competitive Analysis', val: dossier.eightDimensions.competitive },
              { label: 'Customer Analysis', val: dossier.eightDimensions.customer },
              { label: 'Technical Analysis', val: dossier.eightDimensions.technical },
              { label: 'Economic Analysis', val: dossier.eightDimensions.economic },
              { label: 'Go-To-Market Analysis', val: dossier.eightDimensions.goToMarket },
              { label: 'Risk Analysis', val: dossier.eightDimensions.risk },
              { label: 'Scalability Analysis', val: dossier.eightDimensions.scalability },
            ].map((item, idx) => (
              <div
                key={item.label}
                className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1.5"
              >
                <div className="text-xs font-mono text-slate-400">
                  0{idx + 1}. {item.label}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {item.val}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 8-Part Executive Action Framework */}
        <div>
          <h3 className="text-base font-semibold text-white mb-3">
            04. Executive Decision & Execution Plan
          </h3>
          <div className="bg-[#0B1222] border border-white/10 rounded-xl divide-y divide-white/10">
            {[
              { idx: '1', title: 'Decision Framework', text: dossier.executiveConclusion.decisionFramework },
              { idx: '2', title: 'Key Facts & Assumptions', text: dossier.executiveConclusion.keyFactsAssumptions },
              { idx: '3', title: 'Recommended Next Moves', text: dossier.executiveConclusion.recommendedNextMoves },
              { idx: '4', title: 'Build & Execution Plan', text: dossier.executiveConclusion.buildExecutionPlan },
              { idx: '5', title: 'Business Model', text: dossier.executiveConclusion.businessModel },
              { idx: '6', title: 'Revenue Levers', text: dossier.executiveConclusion.revenueLevers },
              { idx: '7', title: 'Risks & Mitigations', text: dossier.executiveConclusion.risks },
              { idx: '8', title: 'Immediate Next Action', text: dossier.executiveConclusion.immediateNextAction },
            ].map((row) => (
              <div
                key={row.idx}
                className="p-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6"
              >
                <div className="sm:w-56 shrink-0 text-xs font-mono text-sky-300">
                  0{row.idx}. {row.title}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed flex-1">
                  {row.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
