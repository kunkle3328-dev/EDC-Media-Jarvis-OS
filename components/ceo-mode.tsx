
import React from 'react';
import { EdcBusinessState } from '@/lib/edc-os-config';
import { 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  BarChart3, 
  Briefcase,
  AlertTriangle,
  ArrowRight,
  Target
} from 'lucide-react';

export function CeoMode({ businessState }: { businessState: EdcBusinessState }) {
  const openTasks = businessState.tasks.filter((t) => t.status !== 'Done');
  const criticalTasks = openTasks.filter((t) => t.priority === 'Critical');
  const pendingApprovals = businessState.approvals.filter((a) => a.status === 'PENDING');
  const opportunities = businessState.opportunities || [];
  
  return (
    <div className="space-y-6 pb-12">
      {/* Strategic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">EDC Media: CEO Executive Control</h2>
          <p className="text-sm text-slate-400">Autonomous Business Intelligence & Strategic Decision Gateway</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase">System Nominal</span>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (ARR)', value: `$${(businessState.economics.mrr * 12).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Critical Risks', value: criticalTasks.length, icon: AlertTriangle, color: criticalTasks.length > 0 ? 'text-rose-400' : 'text-slate-400' },
          { label: 'Pending Decisions', value: pendingApprovals.length, icon: ShieldAlert, color: pendingApprovals.length > 0 ? 'text-amber-400' : 'text-slate-400' },
          { label: 'Agent Velocity', value: '98.4%', icon: Zap, color: 'text-sky-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <kpi.icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts & Decisions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0B1222] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-white/5 px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">Priority Attention</h3>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">URGENT</span>
            </div>
            <div className="p-5 space-y-4">
              {criticalTasks.length > 0 ? (
                criticalTasks.map(task => (
                  <div key={task.id} className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-1">
                    <p className="text-sm font-bold text-rose-200">{task.title}</p>
                    <p className="text-xs text-rose-300/60 font-mono">DUE: {task.dueDate}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 text-emerald-400">
                  <ShieldAlert className="w-5 h-5" />
                  <p className="text-sm font-medium">No critical task blockers detected.</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-white/5">
                <h4 className="text-xs font-mono text-slate-500 uppercase mb-3">Pending CEO Approvals</h4>
                {pendingApprovals.length > 0 ? (
                  <div className="space-y-2">
                    {pendingApprovals.slice(0, 3).map(app => (
                      <div key={app.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{app.action}</p>
                          <p className="text-[10px] text-slate-500 truncate">{app.target}</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Queue clear.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: High-Value Focus */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0B1222] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-white/5 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">High-Leverage Opportunities</h3>
              </div>
              <button className="text-[10px] font-bold text-sky-400 hover:underline">VIEW RADAR</button>
            </div>
            <div className="p-5">
              {opportunities.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <BarChart3 className="w-10 h-10 text-slate-700 mx-auto" />
                  <p className="text-slate-500 text-sm italic">Opportunity Engine is currently scanning for market gaps...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunities
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 4)
                    .map(opp => (
                      <div key={opp.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3 hover:border-sky-500/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            opp.score > 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'
                          }`}>
                            SCORE: {opp.score}
                          </div>
                          <p className="text-xs font-bold text-white font-mono">${(opp.estimatedValueUsd || 0).toLocaleString()}</p>
                        </div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{opp.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{opp.problem}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Strategic Decision Support */}
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-sky-200 uppercase tracking-tight">CEO Decision Framework</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-400">Current Strategic Directive:</p>
                <p className="text-white font-medium">Aggressive Enterprise Expansion in North America Logistics.</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">Operational Focus:</p>
                <p className="text-white font-medium">Stabilizing blended Gross Margin at 84% through agentic optimization.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
