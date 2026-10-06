import { NextResponse } from 'next/server';
import { JarvisRepository } from '@/lib/database/repository';

export async function GET() {
  const state = JarvisRepository.getState();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  return NextResponse.json({
    status: hasGeminiKey ? 'NOMINAL' : 'DEGRADED_MISSING_KEY',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    subsystems: {
      database: 'ONLINE',
      geminiLiveEngine: hasGeminiKey ? 'READY (gemini-3.8-live)' : 'MISSING_API_KEY',
      permissionEngine: 'ENFORCED (RBAC + Approval Gate)',
      memoryLayers: `${state.memories.length} active records`,
      workforceAgents: `${state.agents.length} agents registered`,
      pendingApprovals: state.approvals.filter((a) => a.status === 'PENDING').length,
    },
    metrics: {
      mrrUsd: state.economics.mrr,
      arrUsd: state.economics.arr,
      grossMarginPct: state.economics.grossMarginPct,
      openTasks: state.tasks.filter((t) => t.status !== 'Done').length,
      calendarEvents: state.calendar.length,
      crmContacts: state.contacts.length,
      auditEventsLogged: state.auditEvents.length,
    },
  });
}
