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
  Plus,
  Building2,
  DollarSign
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
    const targetSector = (sectorName || customSector || 'Enterprise Logistics').trim();
    setIsDiscovering(true);
    setShowSectorModal(false);
    try {
      await onTriggerResearch(targetSector);
    } finally {
      setIsDiscovering(false);
      setCustomSector('');
    }
  };

  const presetSectors = [
    { name: 'Enterprise Logistics', focus: 'AI Voice Dispatch & Route Optimization', est: '$120K/yr' },
    { name: 'Legal Tech & Compliance', focus: 'Regulatory Audit & Automated Extraction', est: '$180K/yr' },
    { name: 'Healthcare Operations', focus: 'Patient Voice Intake & EHR Synchronization', est: '$210K/yr' },
    { name: 'B2B SaaS Churn Defense', focus: 'Autonomous Retention & High-Touch Voice', est: '$95K/yr' },
    { name: 'FinTech Wealth Operations', focus: 'Real-Time Briefings & Executive Concierge', est: '$250K/yr' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 pb-8 sm:pb-12 max-w-full overflow-hidden">
      {/* Executive Summary Grid - Responsive 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-[#0B1222] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider truncate">Verified MRR</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-white font-mono">${mrr.toLocaleString()}</span>
            <span className="text-[10px] sm:text-xs text-emerald-400 font-medium">+12.4%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[72%]" />
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider truncate">Gross Margin</span>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-white font-mono">{margin}%</span>
            <span className="text-[10px] sm:text-xs text-sky-400 font-medium">Optimal</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 w-[86%]" />
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider truncate">Pipeline</span>
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-white font-mono">$412.5K</span>
            <span className="text-[10px] sm:text-xs text-amber-400 font-medium">Weighted</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 w-[45%]" />
          </div>
        </div>

        <div className="bg-[#0B1222] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider truncate">ARR Projection</span>
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-white font-mono">${arr.toLocaleString()}</span>
            <span className="text-[10px] sm:text-xs text-purple-400 font-medium">12 Mo</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 w-[60%]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Opportunity Engine Section */}
        <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-white font-display tracking-tight">Revenue Opportunity Radar</h3>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-[10px] font-mono text-sky-400 font-bold shrink-0">
                {sortedOpps.length} Tracked
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => setShowSectorModal(true)}
                disabled={isDiscovering}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="whitespace-nowrap">Sector Selector</span>
              </button>

              <button 
                type="button"
                onClick={() => handleDiscover()}
                disabled={isDiscovering}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer disabled:opacity-50 min-h-[40px]"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="whitespace-nowrap">Scanning...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">Discover New</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MOBILE CARD VIEW (block sm:hidden) */}
          <div className="block sm:hidden space-y-2.5">
            {sortedOpps.length === 0 ? (
              <div className="bg-[#0B1222] border border-white/10 rounded-xl p-6 text-center text-slate-400 text-xs italic">
                No opportunities analyzed yet. Tap &quot;Discover New&quot; to scan enterprise sectors.
              </div>
            ) : (
              sortedOpps.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp)}
                  className="bg-[#0B1222] border border-white/10 rounded-xl p-3.5 space-y-2.5 hover:border-sky-500/30 transition-all cursor-pointer active:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="font-bold text-white text-sm leading-snug break-words">
                        {opp.name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                          <Building2 className="w-2.5 h-2.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{opp.customer}</span>
                        </span>
                      </div>
                    </div>

                    <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full border ${
                      opp.score > 80 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' :
                      opp.score > 60 ? 'border-sky-500/50 bg-sky-500/10 text-sky-400' :
                      'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    } font-bold font-mono text-xs shadow-sm`}>
                      {opp.score}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {opp.problem}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <div>
                      <span className="font-mono text-white font-bold">${(opp.estimatedValueUsd || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-1 uppercase">/ yr</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOpp(opp);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (hidden sm:block) */}
          <div className="hidden sm:block bg-[#0B1222] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Opportunity / Problem</th>
                  <th className="px-4 py-3 font-semibold text-center w-24">Score</th>
                  <th className="px-5 py-3 font-semibold w-36">Est. Value</th>
                  <th className="px-5 py-3 font-semibold text-right w-20">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedOpps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                      No opportunities analyzed. Click &quot;Discover New&quot; to run the market radar.
                    </td>
                  </tr>
                ) : (
                  sortedOpps.map((opp) => (
                    <tr 
                      key={opp.id} 
                      onClick={() => setSelectedOpp(opp)}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-4 min-w-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white group-hover:text-sky-400 transition-colors leading-snug">{opp.name}</p>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 whitespace-nowrap">
                              {opp.customer}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{opp.problem}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border ${
                          opp.score > 80 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/20' :
                          opp.score > 60 ? 'border-sky-500/50 bg-sky-500/10 text-sky-400 shadow-sm shadow-sky-500/20' :
                          'border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/20'
                        } font-bold font-mono text-xs`}>
                          {opp.score}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="font-mono text-white font-semibold">${(opp.estimatedValueUsd || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">Annual Potential</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
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
        <div className="space-y-3.5 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-white font-display tracking-tight">Market Intelligence</h3>
          </div>

          <div className="bg-[#0B1222] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="space-y-2.5">
              <h4 className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider">Sector Performance</h4>
              <div className="space-y-2">
                {[
                  { name: 'Supply Chain & Logistics', growth: '+24.1%', status: 'Explosive' },
                  { name: 'Legal Tech Compliance', growth: '+18.2%', status: 'Bullish' },
                  { name: 'Dental Ops Voice Intake', growth: '+12.4%', status: 'Stable' },
                ].map(trend => (
                  <div key={trend.name} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-xs sm:text-sm text-slate-200 truncate mr-2">{trend.name}</span>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-400 font-mono">{trend.growth}</p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-mono">{trend.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3.5 border-t border-white/5 space-y-2.5">
              <h4 className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider">Strategic Focus</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                J.A.R.V.I.S. is currently optimizing for **High Margin AI Workforce** deployments in enterprise logistics. 
                Focus on reducing labor cost by 40% with autonomous dispatchers.
              </p>
              <button 
                type="button"
                onClick={() => handleDiscover('Enterprise Logistics Voice & Autonomous Dispatch')}
                disabled={isDiscovering}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-sky-400 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-h-[42px]"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Analyzing Sector...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Run Strategic Logistics Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Selection Modal - Full Responsive on Mobile */}
      {showSectorModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSectorModal(false)}
        >
          <div 
            className="w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar bg-[#0B1222] border border-white/15 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-white font-display">Target Opportunity Discovery</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSectorModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Select an enterprise vertical to deploy the J.A.R.V.I.S. Opportunity Radar:
            </p>

            <div className="space-y-2">
              {presetSectors.map((sector) => (
                <button
                  key={sector.name}
                  type="button"
                  onClick={() => handleDiscover(sector.name)}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 transition-all group flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">{sector.name}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{sector.focus}</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded shrink-0 whitespace-nowrap">
                    {sector.est}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Custom Market Sector</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Commercial Real Estate Voice AI"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  className="flex-1 bg-[#060911] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 min-h-[40px]"
                />
                <button
                  type="button"
                  disabled={!customSector.trim() || isDiscovering}
                  onClick={() => handleDiscover(customSector)}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50 min-h-[40px] shrink-0"
                >
                  Discover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Detail Inspection Modal - Fully Responsive on Mobile */}
      {selectedOpp && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedOpp(null)}
        >
          <div 
            className="w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar bg-[#0B1222] border border-white/15 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                    Score: {selectedOpp.score}/100
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    Est. Value: ${(selectedOpp.estimatedValueUsd || 0).toLocaleString()} / yr
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white font-display leading-snug break-words">
                  {selectedOpp.name}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedOpp(null)}
                className="text-slate-400 hover:text-white transition-colors p-1 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#060911] p-3.5 sm:p-4 rounded-xl border border-white/5">
              <div>
                <span className="font-mono text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Target Customer Profile</span>
                <p className="text-slate-200 font-medium">{selectedOpp.customer}</p>
              </div>
              <div>
                <span className="font-mono text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Core Problem Solved</span>
                <p className="text-slate-300 leading-relaxed">{selectedOpp.problem}</p>
              </div>
              {selectedOpp.aiFeasibility !== undefined && (
                <div>
                  <span className="font-mono text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">AI Feasibility Score</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-sky-400 rounded-full" 
                        style={{ width: `${Math.round(selectedOpp.aiFeasibility * 100)}%` }} 
                      />
                    </div>
                    <span className="font-mono text-sky-400 font-bold">{Math.round(selectedOpp.aiFeasibility * 100)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOpp(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors min-h-[38px]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOpp(null);
                  handleDiscover(selectedOpp.customer);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[38px]"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Deepen Market Intel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
