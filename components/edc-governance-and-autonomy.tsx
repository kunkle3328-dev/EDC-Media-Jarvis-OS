'use client';

import React, { useState } from 'react';
import {
  EdcApprovalRequest,
  EdcBusinessState,
  EdcMemoryRecord,
  EdcPersonalItem,
  MemoryLayer,
  OperatingScope,
  ToolExecutionResult,
  VoiceDiagnosticsTelemetry,
} from '@/lib/edc-os-config';
import {
  AuthenticatedContext,
  ExecutiveRole,
} from '@/lib/security/auth-and-permissions';
import {
  ShieldCheck,
  ShieldAlert,
  Target,
  GitBranch,
  Database,
  UserCheck,
  Lock,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Plus,
  Trash2,
  Sparkles,
  FileSignature,
  Terminal,
} from 'lucide-react';

interface EdcGovernanceAndAutonomyProps {
  businessState: EdcBusinessState;
  authContext: AuthenticatedContext | null;
  diagnostics: VoiceDiagnosticsTelemetry;
  onExecuteTool: (
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<ToolExecutionResult | null>;
  onResolveApproval: (
    approvalId: string,
    decision: 'APPROVED' | 'DENIED' | 'DEFERRED'
  ) => Promise<void>;
  onSwitchRole: (role: ExecutiveRole) => Promise<void>;
  onSwitchScope: (scope: OperatingScope) => Promise<void>;
  onVoicePrompt: (prompt: string) => void;
}

type SubTab =
  | 'approvals'
  | 'planner'
  | 'workflows'
  | 'memory'
  | 'personal'
  | 'security';

export function EdcGovernanceAndAutonomy({
  businessState,
  authContext,
  diagnostics,
  onExecuteTool,
  onResolveApproval,
  onSwitchRole,
  onSwitchScope,
  onVoicePrompt,
}: EdcGovernanceAndAutonomyProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('approvals');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Executive Planner state
  const [goalInput, setGoalInput] = useState(
    'Reach $100,000 Monthly Recurring Revenue at >83% Gross Margin'
  );
  const [metricInput, setMetricInput] = useState('$100,000+ MRR · 83% GM');
  const [strategyInput, setStrategyInput] = useState(
    'Close Apex Meridian ($54K ACV) + upsell 4 Mid-Market accounts to Autonomous Voice SLA'
  );

  // Workflow state
  const [workflowTarget, setWorkflowTarget] = useState(
    'Apex Meridian Logistics ($54K ACV)'
  );

  // Memory filter state
  const [memoryLayerFilter, setMemoryLayerFilter] = useState<
    MemoryLayer | 'ALL'
  >('ALL');

  // Personal OS state
  const [personalTitle, setPersonalTitle] = useState('');
  const [personalCategory, setPersonalCategory] =
    useState<EdcPersonalItem['category']>('Reminder');
  const [personalDetail, setPersonalDetail] = useState('');
  const [personalDue, setPersonalDue] = useState('Tomorrow · 08:30');

  const pendingApprovals = businessState.approvals.filter(
    (a) => a.status === 'PENDING'
  );

  const handleTriggerHighRiskDemo = async () => {
    setBusyAction('sendContract');
    try {
      await onExecuteTool('sendContract', {
        company: 'Apex Meridian Logistics',
        recipientEmail: 'm.vance@apexmeridian.io',
        acvUsd: 54000,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleBuildPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    setBusyAction('buildExecutivePlan');
    try {
      await onExecuteTool('buildExecutivePlan', {
        goalTitle: goalInput.trim(),
        targetMetric: metricInput.trim(),
        strategy: strategyInput.trim(),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunWorkflow = async (workflowName: string) => {
    setBusyAction(workflowName);
    try {
      await onExecuteTool('runWorkflow', {
        workflowName,
        contextTarget: workflowTarget,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreatePersonalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalTitle.trim()) return;
    setBusyAction('personalCreate');
    try {
      await onExecuteTool('managePersonalItem', {
        action: 'create',
        category: personalCategory,
        title: personalTitle.trim(),
        detail:
          personalDetail.trim() ||
          'Logged in isolated Personal Operating System',
        dueDate: personalDue.trim() || 'Scheduled',
      });
      setPersonalTitle('');
      setPersonalDetail('');
    } finally {
      setBusyAction(null);
    }
  };

  const filteredMemories: EdcMemoryRecord[] =
    memoryLayerFilter === 'ALL'
      ? businessState.memories
      : businessState.memories.filter((m) => m.layer === memoryLayerFilter);

  return (
    <div className="space-y-6">
      {/* Top Executive Governance Telemetry Banner */}
      <div className="border border-slate-800 bg-slate-900/80 p-5 rounded-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-sky-400 font-semibold">
                J.A.R.V.I.S. Autonomous Operating System Core · Persistent DB
                Synchronized
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">
              Governance, Executive Planning, Workflows, Memory & Personal OS
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative database-backed execution gateway with RBAC
              enforcement, risk-tiered CEO approval center, 5-layer memory, and
              isolated Business/Personal scope separation.
            </p>
          </div>

          {/* Operating Scope & Role Indicators */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border border-slate-800 bg-slate-950 rounded-sm p-1">
              {(['BUSINESS', 'PERSONAL', 'SHARED'] as OperatingScope[]).map(
                (sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => onSwitchScope(sc)}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm transition-colors ${
                      businessState.activeScope === sc
                        ? sc === 'PERSONAL'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sc} SCOPE
                  </button>
                )
              )}
            </div>

            <div className="px-3 py-1.5 border border-slate-800 bg-slate-950 rounded-sm font-mono text-[11px] text-slate-300">
              ROLE:{' '}
              <span className="text-amber-300 font-semibold">
                {authContext?.role || 'CEO_FOUNDER'}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-navigation bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {[
            {
              id: 'approvals' as SubTab,
              label: 'Approval Center',
              badge: pendingApprovals.length,
              icon: ShieldAlert,
            },
            {
              id: 'planner' as SubTab,
              label: 'Executive Planner',
              badge: businessState.executivePlans.length,
              icon: Target,
            },
            {
              id: 'workflows' as SubTab,
              label: 'Workflow Engine',
              badge: businessState.workflows.length,
              icon: GitBranch,
            },
            {
              id: 'memory' as SubTab,
              label: '5-Layer Memory',
              badge: businessState.memories.length,
              icon: Database,
            },
            {
              id: 'personal' as SubTab,
              label: 'Personal OS',
              badge: businessState.personalItems.filter(
                (p) => p.status === 'Active'
              ).length,
              icon: UserCheck,
            },
            {
              id: 'security' as SubTab,
              label: 'RBAC & Diagnostics',
              badge: businessState.auditEvents.length,
              icon: Lock,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-sm border text-left transition-all ${
                  active
                    ? 'border-sky-500/50 bg-sky-500/15 text-sky-300'
                    : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono text-[11px] uppercase tracking-wider truncate">
                    {tab.label}
                  </span>
                </div>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${
                    tab.id === 'approvals' && tab.badge > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. APPROVAL CENTER */}
      {activeSubTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800 bg-slate-900/60 p-4 rounded-md">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider font-mono">
                CEO Risk & Reversibility Approval Gate
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                High-risk or irreversible actions (binding contracts, pricing
                changes, external dispatches) are automatically intercepted by
                the Tool Gateway and queued here for explicit CEO sign-off.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busyAction === 'sendContract'}
                onClick={handleTriggerHighRiskDemo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-mono text-xs uppercase tracking-wider transition-colors"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Queue $54K Contract Dispatch
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {businessState.approvals.map((app: EdcApprovalRequest) => (
              <div
                key={app.id}
                className={`border rounded-md p-4 transition-colors ${
                  app.status === 'PENDING'
                    ? 'border-amber-500/40 bg-amber-950/15'
                    : app.status === 'APPROVED'
                    ? 'border-emerald-500/30 bg-slate-900/70'
                    : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm border ${
                          app.status === 'PENDING'
                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                            : app.status === 'APPROVED'
                            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                            : 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {app.status}
                      </span>
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm border border-rose-500/30 bg-rose-950/30 text-rose-300">
                        RISK: {app.riskLevel}
                      </span>
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm border border-slate-700 bg-slate-950 text-slate-300">
                        {app.reversibility}
                      </span>
                      <span className="font-mono text-[11px] text-sky-400">
                        Tool: {app.toolName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Requested by: {app.requestedBy}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-100">
                      {app.action} —{' '}
                      <span className="text-sky-300">{app.target}</span>
                    </h4>
                    <p className="text-xs text-slate-300">{app.reason}</p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[11px] text-slate-400">
                      <span>
                        IMPACT:{' '}
                        <strong className="text-emerald-300">
                          {app.impact}
                        </strong>
                      </span>
                      <span>ID: {app.id}</span>
                      <span>HASH: {app.parameterHash}</span>
                    </div>
                  </div>

                  {app.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onResolveApproval(app.id, 'APPROVED')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono text-xs uppercase tracking-wider"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Execute
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveApproval(app.id, 'DEFERRED')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-xs uppercase tracking-wider"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Defer
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveApproval(app.id, 'DENIED')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-mono text-xs uppercase tracking-wider"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. EXECUTIVE GOAL-TO-EXECUTION PLANNER */}
      {activeSubTab === 'planner' && (
        <div className="space-y-5">
          <form
            onSubmit={handleBuildPlan}
            className="border border-slate-800 bg-slate-900/70 p-4 rounded-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider text-slate-100 font-semibold">
                  Decompose Executive Goal into Objectives, Projects, Tasks &
                  Agent Owners
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  onVoicePrompt(
                    `Build an executive plan to ${goalInput} and assign tasks to our AI workforce.`
                  )
                }
                className="font-mono text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Command via Voice
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">
                  Executive Goal
                </label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100"
                  placeholder="e.g., Reach $100,000 Monthly Recurring Revenue"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">
                  Target Metric & Margin Guardrail
                </label>
                <input
                  type="text"
                  value={metricInput}
                  onChange={(e) => setMetricInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100"
                  placeholder="e.g., $100,000+ MRR · >82% Gross Margin"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">
                  Primary Strategic Mechanism
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={strategyInput}
                    onChange={(e) => setStrategyInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={busyAction === 'buildExecutivePlan'}
                    className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 font-mono text-xs uppercase tracking-wider rounded-sm shrink-0"
                  >
                    {busyAction === 'buildExecutivePlan'
                      ? 'Building...'
                      : 'Decompose'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="space-y-4">
            {businessState.executivePlans.map((plan) => (
              <div
                key={plan.id}
                className="border border-slate-800 bg-slate-900/60 rounded-md p-5 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        ACTIVE PLAN
                      </span>
                      <span className="font-mono text-xs text-sky-400">
                        TARGET: {plan.targetMetric}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-100 mt-1">
                      {plan.goalTitle}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      STRATEGY: {plan.strategy}
                    </p>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    BASELINE:{' '}
                    <span className="text-amber-300">
                      {plan.currentBaseline}
                    </span>
                  </div>
                </div>

                {/* Objectives list */}
                <div className="flex flex-wrap gap-2">
                  {plan.objectives.map((obj, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono px-2.5 py-1 rounded-sm bg-slate-950 border border-slate-800 text-sky-300"
                    >
                      0{idx + 1}. {obj}
                    </span>
                  ))}
                </div>

                {/* Projects & Agent Owners */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {plan.projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-800/90 bg-slate-950/70 rounded-sm p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold text-white">
                          {proj.name}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-slate-900 text-amber-300 border border-slate-800">
                          {proj.ownerAgent}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        KPI: <span className="text-emerald-300">{proj.kpi}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        DEADLINE: {proj.deadline}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
                  VERIFICATION CRITERIA:{' '}
                  <span className="text-slate-200">
                    {plan.verificationCriteria}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DEPARTMENTAL WORKFLOW ENGINE */}
      {activeSubTab === 'workflows' && (
        <div className="space-y-5">
          <div className="border border-slate-800 bg-slate-900/70 p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-slate-100 font-semibold">
                Autonomous Departmental Workflows (Trigger → Conditions → Steps
                → Verification → Audit)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute multi-agent operational playbooks that coordinate CRM,
                pipeline, margin audit, and task persistence automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflowTarget}
                onChange={(e) => setWorkflowTarget(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-sm px-3 py-1.5 text-xs text-slate-200 font-mono"
                placeholder="Target account / initiative"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {businessState.workflows.map((wf) => (
              <div
                key={wf.id}
                className="border border-slate-800 bg-slate-900/60 rounded-md p-4 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {wf.department}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {wf.runsCount} Verified Runs · {wf.status}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-100">
                    {wf.name}
                  </h4>
                  <p className="text-xs text-slate-400">{wf.description}</p>
                  <p className="text-xs font-mono text-slate-400">
                    TRIGGER: <span className="text-slate-300">{wf.trigger}</span>
                  </p>

                  <div className="space-y-1.5 pt-2">
                    {wf.steps.map((st, idx) => (
                      <div
                        key={st.stepId}
                        className="flex items-center justify-between text-xs border border-slate-800/80 bg-slate-950/60 px-3 py-1.5 rounded-sm"
                      >
                        <span className="text-slate-200">
                          <strong className="font-mono text-sky-400 mr-1.5">
                            0{idx + 1}
                          </strong>
                          {st.name}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="text-amber-300">
                            {st.agentCodename}
                          </span>
                          <span className="text-emerald-400">{st.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="font-mono text-[10px] text-slate-500">
                    Last Run: {wf.lastRunAt || 'Ready'}
                  </span>
                  <button
                    type="button"
                    disabled={busyAction === wf.name}
                    onClick={() => handleRunWorkflow(wf.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 font-mono text-xs uppercase tracking-wider"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {busyAction === wf.name
                      ? 'Executing...'
                      : 'Execute Workflow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 5-LAYER MEMORY SYSTEM */}
      {activeSubTab === 'memory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-800 bg-slate-900/70 p-4 rounded-md">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-slate-100 font-semibold">
                5-Layer Long-Term Memory Architecture (Confidence + Provenance +
                Scope Isolation)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every strategic decision, grounded web search, procedural SOP,
                and personal preference is persisted with explicit confidence
                and sensitivity controls.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  'ALL',
                  'BUSINESS',
                  'SEMANTIC',
                  'PROCEDURAL',
                  'EPISODIC',
                  'PERSONAL',
                ] as const
              ).map((layer) => (
                <button
                  key={layer}
                  type="button"
                  onClick={() => setMemoryLayerFilter(layer)}
                  className={`px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-wider border ${
                    memoryLayerFilter === layer
                      ? 'border-sky-500/50 bg-sky-500/20 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="border border-slate-800 bg-slate-900/60 p-4 rounded-md space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {mem.layer}
                    </span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-slate-950 text-slate-300 border border-slate-800">
                      {mem.kind}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm ${
                        mem.scope === 'PERSONAL'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {mem.scope}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400">
                    CONFIDENCE: {Math.round(mem.confidence * 100)}%
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100">
                  {mem.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {mem.content}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-500">
                  <span>SOURCE: {mem.source}</span>
                  <span>SENSITIVITY: {mem.sensitivity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. PERSONAL LIFE OPERATING SYSTEM */}
      {activeSubTab === 'personal' && (
        <div className="space-y-5">
          <div className="border border-emerald-500/30 bg-emerald-950/10 p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                  Isolated Personal-Life Operating System (Scope:{' '}
                  {businessState.activeScope})
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Personal goals, family reminders, routines, and travel plans are
                strictly isolated from EDC Media enterprise memory unless
                explicitly bridged.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSwitchScope(
                  businessState.activeScope === 'PERSONAL'
                    ? 'BUSINESS'
                    : 'PERSONAL'
                )
              }
              className="px-3 py-1.5 rounded-sm border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 font-mono text-xs uppercase tracking-wider shrink-0"
            >
              {businessState.activeScope === 'PERSONAL'
                ? 'Return to Business Scope'
                : 'Activate Personal Mode'}
            </button>
          </div>

          <form
            onSubmit={handleCreatePersonalItem}
            className="border border-slate-800 bg-slate-900/70 p-4 rounded-md grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <input
              type="text"
              value={personalTitle}
              onChange={(e) => setPersonalTitle(e.target.value)}
              placeholder="New personal goal, reminder, or travel item..."
              className="bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100"
            />
            <select
              value={personalCategory}
              onChange={(e) =>
                setPersonalCategory(
                  e.target.value as EdcPersonalItem['category']
                )
              }
              className="bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-200 font-mono"
            >
              <option value="Reminder">Reminder</option>
              <option value="Goal">Goal</option>
              <option value="Routine">Routine</option>
              <option value="Household & Travel">Household & Travel</option>
              <option value="Important Date">Important Date</option>
              <option value="Note">Note</option>
            </select>
            <input
              type="text"
              value={personalDetail}
              onChange={(e) => setPersonalDetail(e.target.value)}
              placeholder="Details or context..."
              className="bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={personalDue}
                onChange={(e) => setPersonalDue(e.target.value)}
                placeholder="When (e.g. Daily · 07:30)"
                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100"
              />
              <button
                type="submit"
                disabled={busyAction === 'personalCreate'}
                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs uppercase rounded-sm shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {businessState.personalItems.map((item) => (
              <div
                key={item.id}
                className="border border-slate-800 bg-slate-900/60 p-4 rounded-md flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {item.category}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.dueDate}
                    </span>
                  </div>
                  <h4
                    className={`text-sm font-bold ${
                      item.status === 'Completed'
                        ? 'line-through text-slate-500'
                        : 'text-slate-100'
                    }`}
                  >
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400">{item.detail}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-mono text-[10px] text-slate-500">
                    {item.status}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() =>
                          onExecuteTool('managePersonalItem', {
                            action: 'complete',
                            title: item.title,
                          })
                        }
                        className="font-mono text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onExecuteTool('managePersonalItem', {
                          action: 'delete',
                          title: item.title,
                        })
                      }
                      className="font-mono text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SECURITY, RBAC & VOICE DIAGNOSTICS */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* RBAC Role Switcher & Voice Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* RBAC Simulator */}
            <div className="border border-slate-800 bg-slate-900/70 p-4 rounded-md space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider text-slate-100 font-semibold">
                  RBAC Session Role & Permission Enforcement
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Switch active HMAC-signed session role to verify tool permission
                boundaries (`ANALYST_READONLY` blocks all mutations;{' '}
                `CEO_FOUNDER` grants full executive authority).
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(
                  [
                    'CEO_FOUNDER',
                    'OPERATOR',
                    'ANALYST_READONLY',
                  ] as ExecutiveRole[]
                ).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onSwitchRole(r)}
                    className={`px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider border ${
                      (authContext?.role || 'CEO_FOUNDER') === r
                        ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="pt-2 font-mono text-[11px] text-slate-400">
                GRANTED PERMISSIONS:{' '}
                <span className="text-sky-300">
                  {(
                    authContext?.permissions || [
                      'READ',
                      'WRITE',
                      'EXECUTE',
                      'ADMIN',
                      'FINANCIAL',
                      'COMMUNICATION',
                    ]
                  ).join(' · ')}
                </span>
              </div>
            </div>

            {/* Voice & Transport Diagnostics Telemetry */}
            <div className="border border-slate-800 bg-slate-900/70 p-4 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <h3 className="font-mono text-xs uppercase tracking-wider text-slate-100 font-semibold">
                    12-State Voice & Transport Diagnostics
                  </h3>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {diagnostics.transportState}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="bg-slate-950 border border-slate-800 p-2 rounded-sm">
                  <span className="text-slate-500 block text-[9px]">
                    SESSION ID
                  </span>
                  <span className="text-slate-200 truncate block">
                    {diagnostics.sessionId}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-2 rounded-sm">
                  <span className="text-slate-500 block text-[9px]">
                    TURN ID / LATENCY
                  </span>
                  <span className="text-emerald-300">
                    #{diagnostics.activeTurnId} ·{' '}
                    {diagnostics.lastTurnLatencyMs}ms
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-2 rounded-sm">
                  <span className="text-slate-500 block text-[9px]">
                    SAMPLE RATE / QUEUE
                  </span>
                  <span className="text-slate-200">
                    {diagnostics.sampleRateHz}Hz · Q:{diagnostics.queueDepth}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-2 rounded-sm">
                  <span className="text-slate-500 block text-[9px]">
                    BARGE-INS / STALE DROPPED
                  </span>
                  <span className="text-amber-300">
                    {diagnostics.bargeInCount} /{' '}
                    {diagnostics.droppedStalePackets}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-2 rounded-sm">
                  <span className="text-slate-500 block text-[9px]">
                    IN / OUT RMS
                  </span>
                  <span className="text-sky-300">
                    {diagnostics.inputRms} / {diagnostics.outputRms}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-2 rounded-sm">
                  <span className="text-slate-500 block text-[9px]">
                    ERROR CATEGORY
                  </span>
                  <span className="text-slate-300">
                    {diagnostics.lastErrorCategory || 'NONE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Immutable Audit Trail */}
          <div className="border border-slate-800 bg-slate-900/70 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider text-slate-100 font-semibold">
                  Immutable Security & Tool Execution Audit Ledger (
                  {businessState.auditEvents.length} Events)
                </h3>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {businessState.auditEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${
                          ev.resultStatus === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ev.resultStatus === 'APPROVAL_REQUIRED'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {ev.resultStatus}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-sky-300">
                        {ev.action}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Actor: {ev.actor}
                      </span>
                      {ev.toolName && (
                        <span className="font-mono text-[10px] text-amber-300">
                          Tool: {ev.toolName}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300">{ev.summary}</p>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 shrink-0">
                    {ev.timestamp} · {ev.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
