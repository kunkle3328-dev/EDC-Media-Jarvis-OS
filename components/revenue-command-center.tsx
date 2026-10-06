
'use client';

import React, { useState } from 'react';
import { EdcBusinessState, EdcOpportunity } from '@/lib/edc-os-config';
import { 
  TrendingUp, 
  Target, 
  Activity, 
  Layers, 
  Search,
  ArrowUpRight,
  ShieldCheck,
  Globe,
  Loader2,
  Sparkles,
  CheckCircle2,
  X,
  Plus
} from 'lucide-react';

export function RevenueCommandCenter({ 
  businessState, 
  onTriggerResearch 
}: { 
  businessState: EdcBusinessState;
  onTriggerResearch: (query: string) => Promise<void> | void;
}) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<EdcOpportunity | null>(null);
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [customSector, setCustomSector] = useState('');

  const opportunities = businessState.opportunities || [];
  const sortedOpps = [...opportunities].sort((a, b) => b.score - a.score);
  
  const mrr = businessState.economics.mrr;
  const arr = mrr * 12;
  const margin = businessState.economics.grossMarginPct;

  const handleDiscover = async (sectorName?: string) => {
    const targetSector = sectorName || customSector || 'Enterprise Logistics';
    setIsDiscovering(true);
    setShowSectorModal(false);
    try {
      await onTriggerResearch(`Execute opportunity discovery for ${targetSector} focusing on AI Voice & Autonomous Workflows 2026`);
    } finally {
      setIsDiscovering(false);
      setCustomSector('');
    }
  };

  const presetSectors = [
    { name: 'Enterprise Logistics', focus: 'AI Voice Dispatch & Route Optimization', est: '$120K' },
    { name: 'Legal Tech & Compliance', focus: 'Automated Regulatory Audit & Contract Extraction', est: '$180K' },
    { name: 'Healthcare Operations', focus: 'Patient Voice Intake & EHR Synchronization', est: '$210K' },
    { name: 'B2B SaaS Customer Success', focus: 'Autonomous Churn Detection & Executive Interventions', est: '$95K' },
    { name: 'FinTech Wealth Operations', focus: 'Real-Time Portfolio Briefings & High-Touch Voice Concierge', est: '$250K' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Verified MRR</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">${mrr.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-medium">+12.4%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[72%]" />
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Gross Margin</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{margin}%</span>
            <span className="text-xs text-sky-400 font-medium">Optimal</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 w-[86%]" />
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Pipeline Value</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">$412.5K</span>
            <span className="text-xs text-amber-400 font-medium">Weighted</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 w-[45%]" />
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">ARR Projection</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">${arr.toLocaleString()}</span>
            <span className="text-xs text-purple-400 font-medium">Runway: INF</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 w-[60%]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opportunity Engine Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-sky-400" />
              <h3 className="text-lg font-bold text-white font-display">Revenue Opportunity Radar</h3>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-[10px] font-mono text-sky-400">
                {sortedOpps.length} Tracked
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setShowSectorModal(true)}
                disabled={isDiscovering}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Sector Selector</span>
              </button>

              <button 
                type="button"
                onClick={() => handleDiscover()}
                disabled={isDiscovering}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning Markets...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Discover New Opportunities</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-[#0B1222] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Opportunity / Problem</th>
                  <th className="px-6 py-3 font-semibold text-center">Score</th>
                  <th className="px-6 py-3 font-semibold">Est. Value</th>
                  <th className="px-6 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedOpps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                      No opportunities analyzed. Click &quot;Discover New Opportunities&quot; to run the market radar.
                    </td>
                  </tr>
                ) : (
                  sortedOpps.map((opp) => (
                    <tr 
                      key={opp.id} 
                      onClick={() => setSelectedOpp(opp)}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white group-hover:text-sky-400 transition-colors">{opp.name}</p>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                              {opp.customer}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{opp.problem}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border ${
                          opp.score > 80 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/20' :
                          opp.score > 60 ? 'border-sky-500/50 bg-sky-500/10 text-sky-400 shadow-sm shadow-sky-500/20' :
                          'border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/20'
                        } font-bold font-mono text-xs`}>
                          {opp.score}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-mono text-white font-semibold">${(opp.estimatedValueUsd || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">Annual Potential</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOpp(opp);
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Market Context & Trends */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white font-display">Market Intelligence</h3>
          </div>

          <div className="bg-[#0B1222] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="space-y-3">
              <h4 className="text-xs font-mono text-slate-400 uppercase">Sector Performance</h4>
              <div className="space-y-2">
                {[
                  { name: 'Legal Tech AI', growth: '+18.2%', status: 'Bullish' },
                  { name: 'Dental Ops AI', growth: '+12.4%', status: 'Stable' },
                  { name: 'Supply Chain Voice', growth: '+24.1%', status: 'Explosive' },
                ].map(trend => (
                  <div key={trend.name} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-sm text-slate-200">{trend.name}</span>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">{trend.growth}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{trend.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <h4 className="text-xs font-mono text-slate-400 uppercase">Strategic Focus</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                J.A.R.V.I.S. is currently optimizing for **High Margin AI Workforce** deployment in the enterprise logistics sector. 
                Focus on reducing labor cost by 40% using full-duplex voice agents.
              </p>
              <button 
                type="button"
                onClick={() => handleDiscover('Enterprise Logistics Voice & Autonomous Dispatch')}
                disabled={isDiscovering}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-sky-400 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Sector...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Strategic Logistics Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Selection Modal */}
      {showSectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B1222] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white font-display">Target Opportunity Discovery</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSectorModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select a high-yield enterprise vertical or enter a custom sector to deploy the J.A.R.V.I.S. Intelligence Radar:
            </p>

            <div className="space-y-2">
              {presetSectors.map((sector) => (
                <button
                  key={sector.name}
                  type="button"
                  onClick={() => handleDiscover(sector.name)}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 transition-all group flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">{sector.name}</p>
                    <p className="text-xs text-slate-400">{sector.focus}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    {sector.est}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase">Custom Market Sector</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Real Estate Asset Management Voice AI"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  className="flex-1 bg-[#060911] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  disabled={!customSector.trim() || isDiscovering}
                  onClick={() => handleDiscover(customSector)}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Discover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Detail Inspection Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B1222] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Score: {selectedOpp.score}/100
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Est. Value: ${(selectedOpp.estimatedValueUsd || 0).toLocaleString()} / yr
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white font-display mt-1">{selectedOpp.name}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedOpp(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#060911] p-4 rounded-xl border border-white/5">
              <div>
                <span className="font-mono text-slate-500 uppercase tracking-wider block mb-1">Target Customer Profile</span>
                <p className="text-slate-200 font-medium">{selectedOpp.customer}</p>
              </div>
              <div>
                <span className="font-mono text-slate-500 uppercase tracking-wider block mb-1">Core Problem Solved</span>
                <p className="text-slate-300 leading-relaxed">{selectedOpp.problem}</p>
              </div>
              {selectedOpp.aiFeasibility !== undefined && (
                <div>
                  <span className="font-mono text-slate-500 uppercase tracking-wider block mb-1">AI Implementation Feasibility</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-sky-400" 
                        style={{ width: `${Math.round(selectedOpp.aiFeasibility * 100)}%` }} 
                      />
                    </div>
                    <span className="font-mono text-sky-400 font-bold">{Math.round(selectedOpp.aiFeasibility * 100)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOpp(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOpp(null);
                  handleDiscover(selectedOpp.customer);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Deepen Market Intel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
