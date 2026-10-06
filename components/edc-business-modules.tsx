'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  EdcAgent,
  EdcBusinessState,
  EdcDeal,
  EdcProduct,
  ExecutiveProtocolId,
} from '@/lib/edc-os-config';
import {
  Plus,
  Play,
  Pause,
  ArrowUpRight,
  Volume2,
  Sliders,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

const MrrRechartsGraph = dynamic(
  () => import('@/components/mrr-recharts-graph'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center text-xs font-mono text-sky-400 bg-[#060911]/60 rounded-lg border border-white/5">
        Calibrating Recharts MRR Telemetry Graph...
      </div>
    ),
  }
);

interface EdcBusinessModulesProps {
  activeTab: 'ecosystem' | 'agents' | 'economics';
  businessState: EdcBusinessState;
  onUpdateProduct: (product: EdcProduct) => void;
  onCreateProduct: (product: EdcProduct) => void;
  onUpdateAgent: (agent: EdcAgent) => void;
  onCreateAgent: (agent: EdcAgent) => void;
  onUpdateDeal: (deal: EdcDeal) => void;
  onCreateDeal: (deal: EdcDeal) => void;
  onTriggerVoiceCommand: (commandText: string) => void;
  onJumpToProtocol: (protocol: ExecutiveProtocolId, subject: string) => void;
}

const DEAL_STAGES: EdcDeal['stage'][] = [
  'Discovery',
  'Architecture Review',
  'Proposal Sent',
  'Negotiation',
  'Closed Won',
];

export function EdcBusinessModules({
  activeTab,
  businessState,
  onUpdateProduct,
  onCreateProduct,
  onUpdateAgent,
  onCreateAgent,
  onUpdateDeal,
  onCreateDeal,
  onTriggerVoiceCommand,
  onJumpToProtocol,
}: EdcBusinessModulesProps) {
  // Product creation state
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Vertical B2B AI Operating System');
  const [newProdArpu, setNewProdArpu] = useState('3500');
  const [newProdMargin, setNewProdMargin] = useState('84');

  // Agent creation state
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [newAgentCodename, setNewAgentCodename] = useState('');
  const [newAgentDomain, setNewAgentDomain] = useState<EdcAgent['domain']>('Revenue & Outbound');
  const [newAgentObjective, setNewAgentObjective] = useState('');

  // Deal creation state
  const [showNewDealForm, setShowNewDealForm] = useState(false);
  const [newDealCompany, setNewDealCompany] = useState('');
  const [newDealAcv, setNewDealAcv] = useState('48000');
  const [newDealProduct, setNewDealProduct] = useState(
    businessState.products[0]?.name || 'EDC Autonomous Revenue Engine'
  );

  // CFO Unit Economics Interactive Simulator State
  const [simNewClientsPerMonth, setSimNewClientsPerMonth] = useState(6);
  const [simTargetArpu, setSimTargetArpu] = useState(2850);
  const [simGrossMarginPct, setSimGrossMarginPct] = useState(83);
  const [simMonthlyChurnPct, setSimMonthlyChurnPct] = useState(1.6);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    const arpuNum = Math.max(100, parseInt(newProdArpu, 10) || 2500);
    const marginNum = Math.min(96, Math.max(40, parseInt(newProdMargin, 10) || 82));

    const created: EdcProduct = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      category: newProdCategory.trim() || 'B2B AI Platform',
      stage: 'Beta',
      mrr: arpuNum * 3,
      grossMarginPct: marginNum,
      activeCustomers: 3,
      monthlyChurnPct: 0.0,
      arpu: arpuNum,
      aiStack: 'Gemini 3.8 Live + Flash 3.8 Tool Graph',
      moatScore: 88,
      nextMilestone: 'Complete first 5 enterprise design partner deployments',
    };
    onCreateProduct(created);
    setNewProdName('');
    setShowNewProductForm(false);
  };

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentCodename.trim() || !newAgentObjective.trim()) return;
    const created: EdcAgent = {
      id: `agt-${Date.now()}`,
      codename: newAgentCodename.trim().toUpperCase(),
      domain: newAgentDomain,
      status: 'Autonomous Loop',
      model: 'gemini-3.8-flash',
      tasksCompleted24h: 18,
      hoursSavedMonthly: 65,
      costPerRunUsd: 0.03,
      roiMultiple: 28.5,
      currentObjective: newAgentObjective.trim(),
    };
    onCreateAgent(created);
    setNewAgentCodename('');
    setNewAgentObjective('');
    setShowNewAgentForm(false);
  };

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealCompany.trim()) return;
    const acvNum = Math.max(5000, parseInt(newDealAcv, 10) || 36000);
    const created: EdcDeal = {
      id: `deal-${Date.now()}`,
      company: newDealCompany.trim(),
      segment: acvNum >= 40000 ? 'Enterprise' : 'Mid-Market',
      product: newDealProduct,
      acv: acvNum,
      stage: 'Discovery',
      probabilityPct: 40,
      nextAction: 'Run live Gemini 3.8 voice qualification & ROI diagnostic',
    };
    onCreateDeal(created);
    setNewDealCompany('');
    setShowNewDealForm(false);
  };

  const advanceDealStage = (deal: EdcDeal) => {
    const idx = DEAL_STAGES.indexOf(deal.stage);
    const nextIdx = (idx + 1) % DEAL_STAGES.length;
    const nextStage = DEAL_STAGES[nextIdx];
    const nextProb =
      nextStage === 'Closed Won'
        ? 100
        : nextStage === 'Negotiation'
        ? 85
        : nextStage === 'Proposal Sent'
        ? 70
        : nextStage === 'Architecture Review'
        ? 55
        : 35;

    onUpdateDeal({
      ...deal,
      stage: nextStage,
      probabilityPct: nextProb,
    });
  };

  if (activeTab === 'ecosystem') {
    const totalPipelineAcv = businessState.deals.reduce((s, d) => s + d.acv, 0);
    const weightedPipelineAcv = businessState.deals.reduce(
      (s, d) => s + Math.round((d.acv * d.probabilityPct) / 100),
      0
    );

    return (
      <div className="space-y-8">
        {/* Product Portfolio Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white font-display">
                01. EDC Media AI Product Ecosystem
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                High-margin, defensible software products with recurring workflow lock-in. Zero commodity wrappers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewProductForm((v) => !v)}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Launch New Product Line</span>
            </button>
          </div>

          {showNewProductForm && (
            <form
              onSubmit={handleAddProduct}
              className="bg-[#0B1222] border border-sky-500/30 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <input
                type="text"
                required
                placeholder="Product Name (e.g. EDC Legal Voice OS)"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Category"
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
              />
              <input
                type="number"
                placeholder="Target ARPU ($/mo)"
                value={newProdArpu}
                onChange={(e) => setNewProdArpu(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Gross Margin %"
                  value={newProdMargin}
                  onChange={(e) => setNewProdMargin(e.target.value)}
                  className="w-24 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                />
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                >
                  Save Product
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {businessState.products.map((prod) => (
              <div
                key={prod.id}
                className="bg-[#0B1222] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  {/* Unboxed quiet metadata kicker */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                    <span className="text-sky-300">{prod.stage}</span>
                    <span aria-hidden="true">·</span>
                    <span>{prod.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Moat {prod.moatScore}/100</span>
                  </div>

                  <h3 className="text-lg font-semibold text-white">
                    {prod.name}
                  </h3>

                  <p className="text-xs text-slate-400 font-mono">
                    Stack: {prod.aiStack}
                  </p>
                </div>

                {/* Financial Telemetry Grid */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 font-mono tabular-nums">
                  <div>
                    <div className="text-[11px] text-slate-400">MRR</div>
                    <div className="text-sm font-semibold text-white">
                      ${prod.mrr.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Gross Margin</div>
                    <div className="text-sm font-semibold text-emerald-400">
                      {prod.grossMarginPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">ARPU / Clients</div>
                    <div className="text-sm font-semibold text-slate-200">
                      ${prod.arpu.toLocaleString()} · {prod.activeCustomers}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-3">
                  <p className="text-xs text-slate-300">
                    <span className="text-slate-400">Next Milestone: </span>
                    {prod.nextMilestone}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onJumpToProtocol(
                          '10X',
                          `Find 10X leverage, pricing power, and workflow lock-in for ${prod.name} ($${prod.mrr} MRR, ${prod.grossMarginPct}% Gross Margin)`
                        )
                      }
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-sky-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Run 10X Protocol</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onTriggerVoiceCommand(
                          `Jarvis, audit the unit economics and expansion revenue levers for ${prod.name}.`
                        )
                      }
                      className="min-h-[40px] px-3 py-2 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Voice Audit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Sales & Expansion Pipeline */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white font-display">
                02. Enterprise Distribution & Deal Pipeline
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Total Pipeline: <span className="font-mono tabular-nums text-white">${totalPipelineAcv.toLocaleString()} ACV</span>
                <span className="mx-2" aria-hidden="true">·</span>
                Probability-Weighted: <span className="font-mono tabular-nums text-emerald-400">${weightedPipelineAcv.toLocaleString()} ACV</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewDealForm((v) => !v)}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[#0B1222] hover:bg-white/10 border border-white/15 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Log Enterprise Deal</span>
            </button>
          </div>

          {showNewDealForm && (
            <form
              onSubmit={handleAddDeal}
              className="bg-[#0B1222] border border-sky-500/30 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <input
                type="text"
                required
                placeholder="Enterprise Account Name"
                value={newDealCompany}
                onChange={(e) => setNewDealCompany(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
              />
              <select
                value={newDealProduct}
                onChange={(e) => setNewDealProduct(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
              >
                {businessState.products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="ACV ($)"
                  value={newDealAcv}
                  onChange={(e) => setNewDealAcv(e.target.value)}
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                >
                  Add Deal
                </button>
              </div>
            </form>
          )}

          {/* High-Density Data Table */}
          <div className="bg-[#0B1222] border border-white/10 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-slate-400">
                  <th className="py-3 px-4">Account & Segment</th>
                  <th className="py-3 px-4">Product Line</th>
                  <th className="py-3 px-4">Stage (Click to Advance)</th>
                  <th className="py-3 px-4 text-right">ACV</th>
                  <th className="py-3 px-4 text-right">Win Prob</th>
                  <th className="py-3 px-4">Next Closing Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {businessState.deals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{deal.company}</div>
                      <div className="text-xs text-slate-400">{deal.segment}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{deal.product}</td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => advanceDealStage(deal)}
                        className="min-h-[36px] px-3 py-1 rounded-md bg-[#060911] hover:bg-sky-500/15 border border-white/10 hover:border-sky-400/40 text-xs font-mono text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {deal.stage} →
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-white">
                      ${deal.acv.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-400">
                      {deal.probabilityPct}%
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs">
                      {deal.nextAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'agents') {
    const totalHoursSaved = businessState.agents.reduce(
      (s, a) => s + a.hoursSavedMonthly,
      0
    );
    const totalTasks24h = businessState.agents.reduce(
      (s, a) => s + a.tasksCompleted24h,
      0
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white font-display">
              01. Autonomous AI Agent Fleet (AGENTIZE Protocol)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Converting manual agency & executive workflows into controlled, high-ROI autonomous agent loops.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono tabular-nums text-slate-400">
              <span>24H RUNS: {totalTasks24h}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="text-emerald-400">{totalHoursSaved} HRS/MO SAVED</span>
            </div>
            <button
              type="button"
              onClick={() => setShowNewAgentForm((v) => !v)}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy New Agent</span>
            </button>
          </div>
        </div>

        {showNewAgentForm && (
          <form
            onSubmit={handleAddAgent}
            className="bg-[#0B1222] border border-sky-500/30 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input
              type="text"
              required
              placeholder="Agent Codename (e.g. CLOSER-02)"
              value={newAgentCodename}
              onChange={(e) => setNewAgentCodename(e.target.value)}
              className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
            />
            <select
              value={newAgentDomain}
              onChange={(e) => setNewAgentDomain(e.target.value as EdcAgent['domain'])}
              className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
            >
              <option value="Revenue & Outbound">Revenue & Outbound</option>
              <option value="Product & Engineering">Product & Engineering</option>
              <option value="Client Fulfillment">Client Fulfillment</option>
              <option value="CFO & Margin Audit">CFO & Margin Audit</option>
              <option value="Competitive Intel">Competitive Intel</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="Autonomous workflow objective..."
                value={newAgentObjective}
                onChange={(e) => setNewAgentObjective(e.target.value)}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
              >
                Deploy
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businessState.agents.map((agent) => {
            const isPaused = agent.status === 'Paused';
            return (
              <div
                key={agent.id}
                className="bg-[#0B1222] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
                      <span
                        className={
                          isPaused ? 'text-amber-400' : 'text-emerald-400'
                        }
                      >
                        {agent.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{agent.domain}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-300">{agent.model}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white font-mono">
                    {agent.codename}
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {agent.currentObjective}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 font-mono tabular-nums">
                  <div>
                    <div className="text-[11px] text-slate-400">24h Executions</div>
                    <div className="text-sm font-semibold text-white">
                      {agent.tasksCompleted24h} runs
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Labor Leverage</div>
                    <div className="text-sm font-semibold text-emerald-400">
                      {agent.hoursSavedMonthly} hrs/mo
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Unit Cost / ROI</div>
                    <div className="text-sm font-semibold text-sky-300">
                      ${agent.costPerRunUsd.toFixed(2)} · {agent.roiMultiple}x
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAgent({
                        ...agent,
                        status: isPaused ? 'Autonomous Loop' : 'Paused',
                      })
                    }
                    className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Resume Autonomous Loop</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pause Agent Loop</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAgent({
                        ...agent,
                        status: 'Autonomous Loop',
                        tasksCompleted24h: agent.tasksCompleted24h + 1,
                      })
                    }
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Run 7-Step Cycle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onTriggerVoiceCommand(
                        `Jarvis, give me a tactical status report on agent ${agent.codename} and how we can double its operational leverage.`
                      )
                    }
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-sky-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice Brief</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 7-Step Autonomous Agent Execution Loop Telemetry */}
        {Array.isArray(businessState.agentExecutions) &&
          businessState.agentExecutions.length > 0 && (
            <div className="bg-[#0B1222] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white font-display">
                    02. Verified 7-Step Autonomous Execution Loop Telemetry
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time state trace: OBSERVE → INTERPRET → PLAN → ACT →
                    VERIFY → REPORT → LEARN
                  </p>
                </div>
                <span className="font-mono text-xs text-emerald-400">
                  {businessState.agentExecutions.length} Verified Loops Persisted
                </span>
              </div>

              <div className="space-y-4">
                {businessState.agentExecutions.slice(0, 4).map((exec) => (
                  <div
                    key={exec.id}
                    className="bg-[#060911] border border-white/10 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-300 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
                          {exec.agentCodename}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {exec.objective}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400">
                        {exec.status} · {exec.latencyMs}ms · $
                        {exec.costUsd.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-[#0B1222] border border-white/5">
                        <span className="font-mono text-[10px] text-sky-400 block">
                          01. OBSERVE
                        </span>
                        <span className="text-slate-300">
                          {exec.steps.observe}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-[#0B1222] border border-white/5">
                        <span className="font-mono text-[10px] text-sky-400 block">
                          02. INTERPRET & PLAN
                        </span>
                        <span className="text-slate-300">
                          {exec.steps.plan}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-[#0B1222] border border-white/5">
                        <span className="font-mono text-[10px] text-emerald-400 block">
                          03. ACT & VERIFY
                        </span>
                        <span className="text-slate-300">
                          {exec.steps.verify}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-[#0B1222] border border-white/5">
                        <span className="font-mono text-[10px] text-amber-400 block">
                          04. LEARN & NEXT
                        </span>
                        <span className="text-slate-300">
                          {exec.steps.learn}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    );
  }

  // activeTab === 'economics'
  const projectedNewMrr12Mo =
    businessState.economics.mrr +
    simNewClientsPerMonth * 12 * simTargetArpu * (1 - (simMonthlyChurnPct / 100) * 6);
  const projectedArr12Mo = Math.round(projectedNewMrr12Mo * 12);
  const projectedGrossProfitAnnual = Math.round(
    projectedArr12Mo * (simGrossMarginPct / 100)
  );
  const simulatedLtv = Math.round(
    (simTargetArpu * (simGrossMarginPct / 100)) /
      Math.max(0.005, simMonthlyChurnPct / 100)
  );
  const simulatedLtvCac = (
    simulatedLtv / businessState.economics.cacUsd
  ).toFixed(1);
  const enterpriseValuation8x = Math.round(projectedArr12Mo * 8.5);

  // Build unified Historical + Forward 6-Month MRR Growth Trend Series from businessState.economics
  const historicalSeries = (businessState.economics.mrrHistory || []).map(
    (pt, idx, arr) => {
      const isCurrentMonth = idx === arr.length - 1;
      const effectiveMrr = isCurrentMonth
        ? businessState.economics.mrr
        : pt.actualMrr ?? pt.projectedMrr;
      return {
        month: pt.month,
        actualMrr: effectiveMrr,
        projectedMrr: effectiveMrr,
        grossProfitMrr: Math.round(
          effectiveMrr * (businessState.economics.grossMarginPct / 100)
        ),
        arrRunRate: effectiveMrr * 12,
      };
    }
  );

  const forwardMonths = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  let runningMrr = businessState.economics.mrr;
  const forwardSeries = forwardMonths.map((mLabel) => {
    const monthlyChurnLoss = runningMrr * (simMonthlyChurnPct / 100);
    const monthlyExpansion =
      runningMrr * ((businessState.economics.netRetentionPct - 100) / 100 / 12);
    const grossNewMrr = simNewClientsPerMonth * simTargetArpu;
    runningMrr = Math.round(
      runningMrr - monthlyChurnLoss + monthlyExpansion + grossNewMrr
    );
    return {
      month: `${mLabel} (Proj)`,
      actualMrr: undefined as number | undefined,
      projectedMrr: runningMrr,
      grossProfitMrr: Math.round(runningMrr * (simGrossMarginPct / 100)),
      arrRunRate: runningMrr * 12,
    };
  });

  const mrrChartData = [...historicalSeries, ...forwardSeries];
  const sixMonthHistoryStart =
    historicalSeries[0]?.actualMrr || businessState.economics.mrr;
  const historicalGrowthPct = Math.round(
    ((businessState.economics.mrr - sixMonthHistoryStart) /
      Math.max(1, sixMonthHistoryStart)) *
      100
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white font-display">
            01. CFO Unit Economics & Enterprise Value Engine
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Never confuse revenue with profit. Optimize gross margin, LTV:CAC, payback velocity, and enterprise valuation multiple.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onTriggerVoiceCommand(
              `Jarvis, run a CFO unit economics critique on our projected $${projectedArr12Mo.toLocaleString()} ARR model at ${simGrossMarginPct}% gross margin and ${simMonthlyChurnPct}% monthly churn.`
            )
          }
          className="min-h-[44px] px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Volume2 className="w-4 h-4" />
          <span>Speak Live CFO Audit</span>
        </button>
      </div>

      {/* Baseline Telemetry Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono tabular-nums">
        <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Current MRR / ARR</div>
          <div className="text-lg font-semibold text-white mt-1">
            ${businessState.economics.mrr.toLocaleString()}
          </div>
          <div className="text-xs text-sky-300 mt-0.5">
            ${businessState.economics.arr.toLocaleString()} ARR
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Gross Margin / AI COGS</div>
          <div className="text-lg font-semibold text-emerald-400 mt-1">
            {businessState.economics.grossMarginPct}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            ${businessState.economics.monthlyAiInfraSpendUsd.toLocaleString()}/mo token spend
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">LTV : CAC & Payback</div>
          <div className="text-lg font-semibold text-white mt-1">
            {(businessState.economics.ltvUsd / businessState.economics.cacUsd).toFixed(1)}x
          </div>
          <div className="text-xs text-emerald-300 mt-0.5">
            {businessState.economics.paybackMonths} months CAC payback
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Net Dollar Retention</div>
          <div className="text-lg font-semibold text-sky-300 mt-1">
            {businessState.economics.netRetentionPct}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {businessState.economics.automationRatioPct}% Autonomous Delivery
          </div>
        </div>
      </div>

      {/* RECHARTS MRR GROWTH & GROSS PROFIT TRAJECTORY TELEMETRY CHART */}
      <div className="bg-[#0B1222] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>02. MRR Growth & Gross Profit Trajectory (Recharts Telemetry)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical realized MRR (+{historicalGrowthPct}% over 6 mos) connected to live simulated forward expansion and software gross profit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-sky-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span>Realized MRR</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span>Projected MRR</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span>Net Gross Profit</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <MrrRechartsGraph data={mrrChartData} />
        </div>
      </div>

      {/* Interactive 12-Month Scale & Valuation Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#0B1222] border border-white/10 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>03. Pricing & Margin Leverage Controls</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">12-MONTH MODEL</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-mono tabular-nums mb-1.5">
                <span className="text-slate-300">Net New Enterprise Clients / Month</span>
                <span className="text-sky-300">{simNewClientsPerMonth} clients/mo</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={simNewClientsPerMonth}
                onChange={(e) => setSimNewClientsPerMonth(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono tabular-nums mb-1.5">
                <span className="text-slate-300">Target Blended ARPU ($/Month)</span>
                <span className="text-sky-300">${simTargetArpu.toLocaleString()}/mo</span>
              </div>
              <input
                type="range"
                min={1000}
                max={10000}
                step={250}
                value={simTargetArpu}
                onChange={(e) => setSimTargetArpu(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono tabular-nums mb-1.5">
                <span className="text-slate-300">Software Gross Margin Floor (%)</span>
                <span className="text-emerald-400">{simGrossMarginPct}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={94}
                step={1}
                value={simGrossMarginPct}
                onChange={(e) => setSimGrossMarginPct(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono tabular-nums mb-1.5">
                <span className="text-slate-300">Monthly Logo Churn Rate (%)</span>
                <span className="text-amber-300">{simMonthlyChurnPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={simMonthlyChurnPct}
                onChange={(e) => setSimMonthlyChurnPct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#0B1222] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              04. Simulated 12-Month Enterprise Output
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Real-time projection connecting pricing power, retention, and autonomous margin structure.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
            <div className="p-3.5 rounded-lg bg-[#060911] border border-white/10">
              <div className="text-xs text-slate-400">12-Mo Run-Rate ARR</div>
              <div className="text-xl font-semibold text-white mt-1">
                ${projectedArr12Mo.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#060911] border border-white/10">
              <div className="text-xs text-slate-400">Annual Gross Profit</div>
              <div className="text-xl font-semibold text-emerald-400 mt-1">
                ${projectedGrossProfitAnnual.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#060911] border border-white/10">
              <div className="text-xs text-slate-400">Simulated Customer LTV</div>
              <div className="text-xl font-semibold text-sky-300 mt-1">
                ${simulatedLtv.toLocaleString()} ({simulatedLtvCac}x CAC)
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#060911] border border-white/10">
              <div className="text-xs text-slate-400">Implied Enterprise Value (8.5x)</div>
              <div className="text-xl font-semibold text-amber-300 mt-1">
                ${enterpriseValuation8x.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Rule of 40 Score: {Math.round(simGrossMarginPct + 42)}% (Institutional Grade)</span>
            </span>
            <button
              type="button"
              onClick={() =>
                onJumpToProtocol(
                  'MONETIZE',
                  `Restructure EDC Media packaging to lock in $${simTargetArpu}/mo ARPU at ${simGrossMarginPct}% gross margin and reduce churn to ${simMonthlyChurnPct}%`
                )
              }
              className="text-sky-300 hover:text-sky-200 font-medium cursor-pointer whitespace-nowrap"
            >
              Open in MONETIZE →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
