import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  EdcAgent,
  EdcAgentExecution,
  EdcApprovalRequest,
  EdcAuditEvent,
  EdcBusinessState,
  EdcCalendarEvent,
  EdcClientContact,
  EdcDeal,
  EdcDirective,
  EdcExecutivePlan,
  EdcMemoryRecord,
  EdcOpportunity,
  EdcPersonalItem,
  EdcProactiveAlert,
  EdcProduct,
  EdcTask,
  EdcWorkflow,
  INITIAL_EDC_BUSINESS_STATE,
  JarvisPermission,
  OperatingScope,
  ToolExecutionResult,
} from '@/lib/edc-os-config';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: 'CEO_FOUNDER' | 'OPERATOR' | 'ANALYST_READONLY';
  organizationId: string;
  permissions: JarvisPermission[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DbOrganization {
  id: string;
  name: string;
  domain: string;
  tier: 'ENTERPRISE_OS';
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface JarvisPersistentDatabase {
  schemaVersion: number;
  updatedAt: string;
  users: DbUser[];
  organizations: DbOrganization[];
  idempotencyLedger: Record<string, ToolExecutionResult>;
  businessState: EdcBusinessState;
}

const DB_DIR = path.join(process.cwd(), 'lib', 'database', 'data');
const DB_FILE = path.join(DB_DIR, 'jarvis-os-store.json');

let memoryDbCache: JarvisPersistentDatabase | null = null;

export function computeProactiveAlerts(state: EdcBusinessState): EdcProactiveAlert[] {
  const alerts: EdcProactiveAlert[] = [];

  const criticalOpenTasks = state.tasks.filter(
    (t) => t.priority === 'Critical' && t.status !== 'Done'
  );
  if (criticalOpenTasks.length > 0) {
    alerts.push({
      id: 'alt-critical-tasks',
      severity: 'CRITICAL',
      category: 'DEADLINE',
      title: `${criticalOpenTasks.length} Critical Priority Task${criticalOpenTasks.length > 1 ? 's' : ''} Require Execution`,
      description: criticalOpenTasks.map((t) => `${t.title} (${t.dueDate})`).join(' · '),
      recommendedCommand: `Jarvis, help me execute our critical priority task: "${criticalOpenTasks[0].title}".`,
    });
  }

  const pendingApprovals = (state.approvals || []).filter((a) => a.status === 'PENDING');
  if (pendingApprovals.length > 0) {
    alerts.push({
      id: 'alt-approvals',
      severity: 'HIGH',
      category: 'APPROVAL_PENDING',
      title: `${pendingApprovals.length} High-Impact Action${pendingApprovals.length > 1 ? 's' : ''} Awaiting CEO Approval`,
      description: pendingApprovals.map((a) => `${a.action} (${a.target})`).join(' · '),
      recommendedCommand: 'Jarvis, show me what needs my approval and summarize the risk.',
    });
  }

  const gapTo100k = Math.max(0, 100000 - state.economics.mrr);
  if (gapTo100k > 0) {
    alerts.push({
      id: 'alt-mrr-gap',
      severity: 'OPPORTUNITY',
      category: 'MRR_GAP',
      title: `$${gapTo100k.toLocaleString()}/mo Away from $100,000 MRR Milestone`,
      description: `Current verified MRR is $${state.economics.mrr.toLocaleString()}. Closing late-stage enterprise pipeline deals will push EDC Media past $100K MRR.`,
      recommendedCommand: 'Jarvis, build a plan to reach $100K MRR.',
    });
  } else {
    alerts.push({
      id: 'alt-mrr-achieved',
      severity: 'OPPORTUNITY',
      category: 'MRR_GAP',
      title: `$100K+ MRR Milestone Achieved ($${state.economics.mrr.toLocaleString()}/mo)`,
      description: `EDC Media is operating at $${state.economics.arr.toLocaleString()} ARR with ${state.economics.grossMarginPct}% gross margin.`,
      recommendedCommand: 'Jarvis, run the 10X protocol to scale from $100K to $250K MRR.',
    });
  }

  return alerts;
}

function createInitialDatabase(): JarvisPersistentDatabase {
  const now = new Date().toISOString();
  const initialState: EdcBusinessState = JSON.parse(
    JSON.stringify(INITIAL_EDC_BUSINESS_STATE)
  );
  initialState.proactiveAlerts = computeProactiveAlerts(initialState);

  return {
    schemaVersion: 2,
    updatedAt: now,
    users: [
      {
        id: 'usr-ceo-edc',
        email: 'kunkle3328@gmail.com',
        name: 'EDC Media Chief Executive',
        role: 'CEO_FOUNDER',
        organizationId: 'org-edc-media',
        permissions: [
          'READ',
          'WRITE',
          'EXECUTE',
          'ADMIN',
          'FINANCIAL',
          'COMMUNICATION',
          'CUSTOMER_DATA',
          'AGENT_CONTROL',
          'AUTONOMOUS_EXECUTION',
          'SYSTEM_CONFIGURATION',
        ],
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    ],
    organizations: [
      {
        id: 'org-edc-media',
        name: 'EDC Media',
        domain: 'edcmedia.ai',
        tier: 'ENTERPRISE_OS',
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    ],
    idempotencyLedger: {},
    businessState: initialState,
  };
}

export function loadDatabase(): JarvisPersistentDatabase {
  if (memoryDbCache) {
    return memoryDbCache;
  }

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as JarvisPersistentDatabase;
      if (parsed && parsed.businessState && parsed.schemaVersion >= 2) {
        parsed.businessState.proactiveAlerts = computeProactiveAlerts(
          parsed.businessState
        );
        memoryDbCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Database load warning, initializing clean store:', err);
  }

  const fresh = createInitialDatabase();
  saveDatabase(fresh);
  return fresh;
}

export function saveDatabase(db: JarvisPersistentDatabase): JarvisPersistentDatabase {
  db.updatedAt = new Date().toISOString();
  db.businessState.proactiveAlerts = computeProactiveAlerts(db.businessState);
  memoryDbCache = db;

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }

  return db;
}

export function getAuthoritativeBusinessState(): EdcBusinessState {
  const db = loadDatabase();
  return db.businessState;
}

export function hashParameters(params: unknown): string {
  const canonical = JSON.stringify(params || {});
  return (
    'sha256:' +
    crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16)
  );
}

export function recordAuditEvent(params: {
  actor: string;
  actorType: 'ai' | 'user' | 'agent' | 'workflow';
  action: string;
  target: string;
  toolName: string;
  parameters: unknown;
  resultStatus: 'SUCCESS' | 'FAILED' | 'APPROVAL_REQUIRED' | 'DENIED';
  summary: string;
  approvalId?: string;
}): EdcAuditEvent {
  const db = loadDatabase();
  const now = new Date().toISOString();
  const timeFormatted = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const audit: EdcAuditEvent = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: 'org-edc-media',
    userId: 'usr-ceo-edc',
    createdAt: now,
    updatedAt: now,
    version: 1,
    timestamp: `Today · ${timeFormatted}`,
    actor: params.actor,
    actorType: params.actorType,
    action: params.action,
    target: params.target,
    toolName: params.toolName,
    parametersHash: hashParameters(params.parameters),
    resultStatus: params.resultStatus,
    summary: params.summary,
    approvalId: params.approvalId,
  };

  db.businessState.auditEvents = [
    audit,
    ...(db.businessState.auditEvents || []).slice(0, 99),
  ];
  saveDatabase(db);
  return audit;
}

// Repository Domain Mutation Helpers
export const JarvisRepository = {
  getState(): EdcBusinessState {
    return getAuthoritativeBusinessState();
  },

  getUser(userId = 'usr-ceo-edc'): DbUser {
    const db = loadDatabase();
    return db.users.find((u) => u.id === userId) || db.users[0];
  },

  checkIdempotency(key?: string): ToolExecutionResult | null {
    if (!key) return null;
    const db = loadDatabase();
    return db.idempotencyLedger[key] || null;
  },

  saveIdempotency(key: string, result: ToolExecutionResult): void {
    const db = loadDatabase();
    db.idempotencyLedger[key] = result;
    saveDatabase(db);
  },

  setScope(scope: OperatingScope): EdcBusinessState {
    const db = loadDatabase();
    db.businessState.activeScope = scope;
    saveDatabase(db);
    return db.businessState;
  },

  upsertTask(
    action: 'create' | 'update' | 'complete' | 'delete',
    payload: Partial<EdcTask> & { title?: string; id?: string }
  ): { task?: EdcTask; deletedId?: string; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const tasks = [...db.businessState.tasks];

    if (action === 'create') {
      // Idempotent duplicate guard: if identical title was created in last 10 seconds, return it
      const recentDup = tasks.find(
        (t) =>
          payload.title &&
          t.title.toLowerCase() === payload.title.trim().toLowerCase() &&
          t.createdAt &&
          Date.now() - new Date(t.createdAt).getTime() < 10000
      );
      if (recentDup) {
        return { task: recentDup, state: db.businessState };
      }

      const created: EdcTask = {
        id: payload.id || `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        organizationId: 'org-edc-media',
        userId: 'usr-ceo-edc',
        createdAt: now,
        updatedAt: now,
        version: 1,
        title: (payload.title || 'Untitled Executive Task').trim(),
        category: payload.category || 'Revenue & Sales',
        priority: payload.priority || 'High',
        status: payload.status || 'Todo',
        dueDate: payload.dueDate || 'Today · 17:00',
        assignee: payload.assignee || 'Executive',
        linkedClient: payload.linkedClient,
        scope: payload.scope || db.businessState.activeScope || 'BUSINESS',
      };
      db.businessState.tasks = [created, ...tasks];
      saveDatabase(db);
      return { task: created, state: db.businessState };
    }

    const idx = tasks.findIndex(
      (t) =>
        (payload.id && t.id === payload.id) ||
        (payload.title &&
          t.title.toLowerCase().includes(payload.title.trim().toLowerCase()))
    );

    if (idx === -1) {
      throw new Error(
        `Task matching "${payload.id || payload.title || 'unknown'}" was not found in the database.`
      );
    }

    if (action === 'delete') {
      const removed = tasks[idx];
      db.businessState.tasks = tasks.filter((_, i) => i !== idx);
      saveDatabase(db);
      return { deletedId: removed.id, state: db.businessState };
    }

    const existing = tasks[idx];
    const updated: EdcTask = {
      ...existing,
      title: payload.title ? payload.title.trim() : existing.title,
      category: payload.category || existing.category,
      priority: payload.priority || existing.priority,
      status:
        action === 'complete' ? 'Done' : payload.status || existing.status,
      dueDate: payload.dueDate || existing.dueDate,
      assignee: payload.assignee || existing.assignee,
      linkedClient:
        payload.linkedClient !== undefined
          ? payload.linkedClient
          : existing.linkedClient,
      updatedAt: now,
      version: (existing.version || 1) + 1,
    };

    tasks[idx] = updated;
    db.businessState.tasks = tasks;
    saveDatabase(db);
    return { task: updated, state: db.businessState };
  },

  upsertCalendarEvent(
    action: 'schedule' | 'confirm' | 'complete' | 'cancel' | 'update',
    payload: Partial<EdcCalendarEvent> & { title?: string; id?: string }
  ): { event?: EdcCalendarEvent; deletedId?: string; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const calendar = [...db.businessState.calendar];

    if (action === 'schedule') {
      const created: EdcCalendarEvent = {
        id: payload.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        organizationId: 'org-edc-media',
        userId: 'usr-ceo-edc',
        createdAt: now,
        updatedAt: now,
        version: 1,
        title: (payload.title || 'Executive Strategy Session').trim(),
        date: payload.date || 'Today',
        startTime: payload.startTime || '15:00',
        durationMins: payload.durationMins || 30,
        type: payload.type || 'Client Meeting',
        attendees:
          Array.isArray(payload.attendees) && payload.attendees.length > 0
            ? payload.attendees
            : ['EDC Executive'],
        status: payload.status || 'Confirmed',
        notes: payload.notes || 'Scheduled via J.A.R.V.I.S. Executive OS.',
        scope: payload.scope || db.businessState.activeScope || 'BUSINESS',
      };
      db.businessState.calendar = [created, ...calendar];
      saveDatabase(db);
      return { event: created, state: db.businessState };
    }

    const idx = calendar.findIndex(
      (e) =>
        (payload.id && e.id === payload.id) ||
        (payload.title &&
          e.title.toLowerCase().includes(payload.title.trim().toLowerCase()))
    );

    if (idx === -1) {
      throw new Error(
        `Calendar event matching "${payload.id || payload.title || 'unknown'}" was not found.`
      );
    }

    if (action === 'cancel') {
      const removed = calendar[idx];
      db.businessState.calendar = calendar.filter((_, i) => i !== idx);
      saveDatabase(db);
      return { deletedId: removed.id, state: db.businessState };
    }

    const existing = calendar[idx];
    const updated: EdcCalendarEvent = {
      ...existing,
      title: payload.title ? payload.title.trim() : existing.title,
      date: payload.date || existing.date,
      startTime: payload.startTime || existing.startTime,
      durationMins: payload.durationMins || existing.durationMins,
      type: payload.type || existing.type,
      attendees: payload.attendees || existing.attendees,
      status:
        action === 'complete'
          ? 'Completed'
          : action === 'confirm'
          ? 'Confirmed'
          : payload.status || existing.status,
      notes: payload.notes || existing.notes,
      updatedAt: now,
      version: (existing.version || 1) + 1,
    };

    calendar[idx] = updated;
    db.businessState.calendar = calendar;
    saveDatabase(db);
    return { event: updated, state: db.businessState };
  },

  upsertContact(
    action: 'create' | 'update' | 'log_note',
    payload: Partial<EdcClientContact> & { name?: string; id?: string }
  ): { contact: EdcClientContact; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const contacts = [...db.businessState.contacts];

    const idx = contacts.findIndex(
      (c) =>
        (payload.id && c.id === payload.id) ||
        (payload.name &&
          c.name.toLowerCase().includes(payload.name.trim().toLowerCase())) ||
        (payload.company &&
          c.company.toLowerCase().includes(payload.company.trim().toLowerCase()))
    );

    if (idx >= 0 && action !== 'create') {
      const existing = contacts[idx];
      const updated: EdcClientContact = {
        ...existing,
        name: payload.name ? payload.name.trim() : existing.name,
        role: payload.role || existing.role,
        company: payload.company || existing.company,
        email: payload.email || existing.email,
        phone: payload.phone || existing.phone,
        tier: payload.tier || existing.tier,
        status: payload.status || existing.status,
        mrrValue:
          typeof payload.mrrValue === 'number'
            ? payload.mrrValue
            : existing.mrrValue,
        lastContacted: payload.lastContacted || 'Updated just now',
        notes: payload.notes || existing.notes,
        updatedAt: now,
        version: (existing.version || 1) + 1,
      };
      contacts[idx] = updated;
      db.businessState.contacts = contacts;
      saveDatabase(db);
      return { contact: updated, state: db.businessState };
    }

    const cleanName = (payload.name || 'Executive Contact').trim();
    const cleanCompany = (payload.company || 'Enterprise Partner').trim();
    const created: EdcClientContact = {
      id: payload.id || `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      organizationId: 'org-edc-media',
      userId: 'usr-ceo-edc',
      createdAt: now,
      updatedAt: now,
      version: 1,
      name: cleanName,
      role: payload.role || 'Chief Executive Officer',
      company: cleanCompany,
      email:
        payload.email ||
        `${cleanName.toLowerCase().replace(/\s+/g, '.')}@${cleanCompany
          .toLowerCase()
          .replace(/\s+/g, '')}.com`,
      phone: payload.phone || '+1 (415) 890-0100',
      tier: payload.tier || 'Enterprise',
      status: payload.status || 'Hot Prospect',
      mrrValue: typeof payload.mrrValue === 'number' ? payload.mrrValue : 4500,
      lastContacted: 'Just now',
      notes: payload.notes || 'Added via J.A.R.V.I.S. CRM.',
    };

    db.businessState.contacts = [created, ...contacts];
    saveDatabase(db);
    return { contact: created, state: db.businessState };
  },

  upsertProduct(
    action: 'create' | 'update',
    payload: Partial<EdcProduct> & { name?: string; id?: string }
  ): { product: EdcProduct; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const products = [...db.businessState.products];

    const idx = products.findIndex(
      (p) =>
        (payload.id && p.id === payload.id) ||
        (payload.name &&
          p.name.toLowerCase().includes(payload.name.trim().toLowerCase()))
    );

    let targetProd: EdcProduct;
    if (idx >= 0) {
      const existing = products[idx];
      targetProd = {
        ...existing,
        name: payload.name ? payload.name.trim() : existing.name,
        category: payload.category || existing.category,
        stage: payload.stage || existing.stage,
        mrr: typeof payload.mrr === 'number' ? payload.mrr : existing.mrr,
        grossMarginPct:
          typeof payload.grossMarginPct === 'number'
            ? payload.grossMarginPct
            : existing.grossMarginPct,
        arpu: typeof payload.arpu === 'number' ? payload.arpu : existing.arpu,
        activeCustomers:
          typeof payload.activeCustomers === 'number'
            ? payload.activeCustomers
            : existing.activeCustomers,
        nextMilestone: payload.nextMilestone || existing.nextMilestone,
        updatedAt: now,
        version: (existing.version || 1) + 1,
      };
      products[idx] = targetProd;
    } else {
      targetProd = {
        id: payload.id || `prod-${Date.now()}`,
        organizationId: 'org-edc-media',
        createdAt: now,
        updatedAt: now,
        version: 1,
        name: (payload.name || 'EDC New AI Product').trim(),
        category: payload.category || 'B2B Autonomous Software',
        stage: payload.stage || 'Beta',
        mrr: typeof payload.mrr === 'number' ? payload.mrr : 12000,
        grossMarginPct:
          typeof payload.grossMarginPct === 'number'
            ? payload.grossMarginPct
            : 84,
        activeCustomers: payload.activeCustomers || 4,
        monthlyChurnPct: 0,
        arpu: typeof payload.arpu === 'number' ? payload.arpu : 3000,
        aiStack: payload.aiStack || 'Gemini 3.8 Live + Flash 3.8',
        moatScore: payload.moatScore || 89,
        nextMilestone:
          payload.nextMilestone || 'Scale initial enterprise cohort',
      };
      products.push(targetProd);
    }

    const totalMrr = products.reduce((s, p) => s + p.mrr, 0);
    const weightedMargin =
      totalMrr > 0
        ? Number(
            (
              products.reduce(
                (s, p) => s + p.mrr * (p.grossMarginPct / 100),
                0
              ) /
              totalMrr *
              100
            ).toFixed(1)
          )
        : db.businessState.economics.grossMarginPct;

    db.businessState.products = products;
    db.businessState.economics.mrr = totalMrr;
    db.businessState.economics.arr = totalMrr * 12;
    db.businessState.economics.grossMarginPct = weightedMargin;
    db.businessState.economics.mrrHistory =
      db.businessState.economics.mrrHistory.map((pt, i, arr) =>
        i === arr.length - 1
          ? {
              ...pt,
              actualMrr: totalMrr,
              projectedMrr: totalMrr,
              grossProfitMrr: Math.round(totalMrr * (weightedMargin / 100)),
            }
          : pt
      );

    saveDatabase(db);
    return { product: targetProd, state: db.businessState };
  },

  upsertDeal(
    payload: Partial<EdcDeal> & { company?: string; id?: string }
  ): { deal: EdcDeal; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const deals = [...db.businessState.deals];

    const idx = deals.findIndex(
      (d) =>
        (payload.id && d.id === payload.id) ||
        (payload.company &&
          d.company.toLowerCase().includes(payload.company.trim().toLowerCase()))
    );

    let targetDeal: EdcDeal;
    const wasClosedWon = idx >= 0 && deals[idx].stage === 'Closed Won';

    if (idx >= 0) {
      const existing = deals[idx];
      const nextStage = payload.stage || existing.stage;
      targetDeal = {
        ...existing,
        company: payload.company ? payload.company.trim() : existing.company,
        product: payload.product || existing.product,
        acv: typeof payload.acv === 'number' ? payload.acv : existing.acv,
        stage: nextStage,
        probabilityPct:
          nextStage === 'Closed Won'
            ? 100
            : typeof payload.probabilityPct === 'number'
            ? payload.probabilityPct
            : existing.probabilityPct,
        nextAction: payload.nextAction || existing.nextAction,
        updatedAt: now,
        version: (existing.version || 1) + 1,
      };
      deals[idx] = targetDeal;
    } else {
      const nextStage = payload.stage || 'Proposal Sent';
      targetDeal = {
        id: payload.id || `deal-${Date.now()}`,
        organizationId: 'org-edc-media',
        createdAt: now,
        updatedAt: now,
        version: 1,
        company: (payload.company || 'Enterprise Client').trim(),
        segment: payload.segment || 'Enterprise',
        product: payload.product || 'EDC Autonomous Revenue Engine',
        acv: typeof payload.acv === 'number' ? payload.acv : 48000,
        stage: nextStage,
        probabilityPct:
          nextStage === 'Closed Won'
            ? 100
            : typeof payload.probabilityPct === 'number'
            ? payload.probabilityPct
            : 70,
        nextAction:
          payload.nextAction || 'Execute executive technical review',
      };
      deals.unshift(targetDeal);
    }

    // If deal newly transitioned to Closed Won, add its monthly value (ACV / 12) to product & total MRR!
    if (!wasClosedWon && targetDeal.stage === 'Closed Won') {
      const monthlyAddition = Math.round(targetDeal.acv / 12);
      const prodIdx = db.businessState.products.findIndex((p) =>
        p.name.toLowerCase().includes(targetDeal.product.toLowerCase())
      );
      if (prodIdx >= 0) {
        db.businessState.products[prodIdx].mrr += monthlyAddition;
        db.businessState.products[prodIdx].activeCustomers += 1;
      }
      const nextTotalMrr = db.businessState.products.reduce(
        (s, p) => s + p.mrr,
        0
      );
      db.businessState.economics.mrr = nextTotalMrr;
      db.businessState.economics.arr = nextTotalMrr * 12;
      db.businessState.economics.mrrHistory =
        db.businessState.economics.mrrHistory.map((pt, i, arr) =>
          i === arr.length - 1
            ? {
                ...pt,
                actualMrr: nextTotalMrr,
                projectedMrr: nextTotalMrr,
                grossProfitMrr: Math.round(
                  nextTotalMrr *
                    (db.businessState.economics.grossMarginPct / 100)
                ),
              }
            : pt
        );
    }

    db.businessState.deals = deals;
    saveDatabase(db);
    return { deal: targetDeal, state: db.businessState };
  },

  upsertAgent(
    payload: Partial<EdcAgent> & { codename?: string; id?: string }
  ): { agent: EdcAgent; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const agents = [...db.businessState.agents];

    const idx = agents.findIndex(
      (a) =>
        (payload.id && a.id === payload.id) ||
        (payload.codename &&
          a.codename.toUpperCase() === payload.codename.trim().toUpperCase())
    );

    let targetAgent: EdcAgent;
    if (idx >= 0) {
      const existing = agents[idx];
      targetAgent = {
        ...existing,
        status: payload.status || existing.status,
        domain: payload.domain || existing.domain,
        currentObjective: payload.currentObjective || existing.currentObjective,
        tasksCompleted24h:
          typeof payload.tasksCompleted24h === 'number'
            ? payload.tasksCompleted24h
            : existing.tasksCompleted24h,
        lastRunAt: payload.lastRunAt || 'Just now',
        lastOutputSummary:
          payload.lastOutputSummary || existing.lastOutputSummary,
        updatedAt: now,
        version: (existing.version || 1) + 1,
      };
      agents[idx] = targetAgent;
    } else {
      targetAgent = {
        id: payload.id || `agt-${Date.now()}`,
        organizationId: 'org-edc-media',
        createdAt: now,
        updatedAt: now,
        version: 1,
        codename: (payload.codename || 'AGENT-X').trim().toUpperCase(),
        role: payload.role || 'OPERATIONS_AGENT',
        mission: payload.mission || 'Autonomous Workflow Execution',
        domain: payload.domain || 'Revenue & Outbound',
        status: payload.status || 'Autonomous Loop',
        health: 'Nominal',
        model: payload.model || 'gemini-3.8-flash',
        tasksCompleted24h: 1,
        hoursSavedMonthly: 75,
        costPerRunUsd: 0.03,
        roiMultiple: 31.0,
        currentObjective:
          payload.currentObjective ||
          'Autonomous workflow execution for EDC Media',
        lastRunAt: 'Just now',
        lastOutputSummary: 'Agent initialized and verified in active fleet.',
      };
      agents.unshift(targetAgent);
    }

    db.businessState.agents = agents;
    saveDatabase(db);
    return { agent: targetAgent, state: db.businessState };
  },

  recordAgentExecution(exec: EdcAgentExecution): EdcBusinessState {
    const db = loadDatabase();
    db.businessState.agentExecutions = [
      exec,
      ...(db.businessState.agentExecutions || []).slice(0, 49),
    ];
    saveDatabase(db);
    return db.businessState;
  },

  addDirective(directive: EdcDirective): EdcBusinessState {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const record: EdcDirective = {
      ...directive,
      id: directive.id || `dir-${Date.now()}`,
      organizationId: 'org-edc-media',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    db.businessState.directives = [record, ...db.businessState.directives];
    saveDatabase(db);
    return db.businessState;
  },

  addMemory(
    payload: Omit<
      EdcMemoryRecord,
      'id' | 'createdAt' | 'updatedAt' | 'lastConfirmedAt' | 'version'
    >
  ): { memory: EdcMemoryRecord; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const memory: EdcMemoryRecord = {
      ...payload,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      organizationId: 'org-edc-media',
      userId: 'usr-ceo-edc',
      createdAt: now,
      updatedAt: now,
      lastConfirmedAt: now,
      version: 1,
    };
    db.businessState.memories = [
      memory,
      ...(db.businessState.memories || []),
    ];
    saveDatabase(db);
    return { memory, state: db.businessState };
  },

  createApprovalRequest(
    req: Omit<
      EdcApprovalRequest,
      'id' | 'createdAt' | 'updatedAt' | 'version' | 'status' | 'parameterHash'
    >
  ): { approval: EdcApprovalRequest; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const approval: EdcApprovalRequest = {
      ...req,
      id: `apr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      organizationId: 'org-edc-media',
      createdAt: now,
      updatedAt: now,
      version: 1,
      parameterHash: hashParameters(req.proposedArgs),
      status: 'PENDING',
    };
    db.businessState.approvals = [
      approval,
      ...(db.businessState.approvals || []),
    ];
    saveDatabase(db);
    return { approval, state: db.businessState };
  },

  resolveApprovalRequest(
    approvalId: string,
    decision: 'APPROVED' | 'DENIED' | 'DEFERRED'
  ): { approval: EdcApprovalRequest; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const approvals = [...(db.businessState.approvals || [])];
    const idx = approvals.findIndex((a) => a.id === approvalId);
    if (idx === -1) {
      throw new Error(`Approval request "${approvalId}" not found.`);
    }

    const target = {
      ...approvals[idx],
      status: decision,
      updatedAt: now,
      version: (approvals[idx].version || 1) + 1,
    };
    approvals[idx] = target;
    db.businessState.approvals = approvals;

    // If approved and it was the Apex Meridian contract, also advance the deal or log directive!
    if (decision === 'APPROVED') {
      if (
        target.toolName === 'sendContract' &&
        typeof target.proposedArgs.company === 'string'
      ) {
        this.upsertDeal({
          company: target.proposedArgs.company,
          stage: 'Closed Won',
          probabilityPct: 100,
          nextAction: 'Contract signed & dispatched via CEO Approval Center',
        });
      }
    }

    recordAuditEvent({
      actor: 'CEO Executive',
      actorType: 'user',
      action: `APPROVAL_${decision}`,
      target: target.target,
      toolName: target.toolName,
      parameters: target.proposedArgs,
      resultStatus: decision === 'APPROVED' ? 'SUCCESS' : 'DENIED',
      summary: `CEO ${decision.toLowerCase()} high-risk action: ${target.action}`,
      approvalId: target.id,
    });

    saveDatabase(db);
    return { approval: target, state: db.businessState };
  },

  saveExecutivePlan(plan: EdcExecutivePlan): EdcBusinessState {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const record: EdcExecutivePlan = {
      ...plan,
      id: plan.id || `plan-${Date.now()}`,
      organizationId: 'org-edc-media',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    db.businessState.executivePlans = [
      record,
      ...(db.businessState.executivePlans || []),
    ];
    saveDatabase(db);
    return db.businessState;
  },

  upsertPersonalItem(
    action: 'create' | 'complete' | 'delete',
    payload: Partial<EdcPersonalItem> & { title?: string; id?: string }
  ): { item?: EdcPersonalItem; state: EdcBusinessState } {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const items = [...(db.businessState.personalItems || [])];

    if (action === 'create') {
      const created: EdcPersonalItem = {
        id: payload.id || `pers-${Date.now()}`,
        userId: 'usr-ceo-edc',
        createdAt: now,
        updatedAt: now,
        version: 1,
        category: payload.category || 'Reminder',
        title: (payload.title || 'Personal Executive Reminder').trim(),
        detail: payload.detail || 'Logged in isolated Personal OS scope.',
        dueDate: payload.dueDate || 'Tomorrow · 09:00',
        status: 'Active',
        priority: payload.priority || 'High',
      };
      db.businessState.personalItems = [created, ...items];
      saveDatabase(db);
      return { item: created, state: db.businessState };
    }

    const idx = items.findIndex(
      (p) =>
        (payload.id && p.id === payload.id) ||
        (payload.title &&
          p.title.toLowerCase().includes(payload.title.trim().toLowerCase()))
    );
    if (idx === -1) {
      throw new Error(`Personal item "${payload.id || payload.title}" not found.`);
    }

    if (action === 'delete') {
      db.businessState.personalItems = items.filter((_, i) => i !== idx);
      saveDatabase(db);
      return { state: db.businessState };
    }

    items[idx] = {
      ...items[idx],
      status:
        items[idx].status === 'Completed' ? 'Active' : 'Completed',
      updatedAt: now,
      version: (items[idx].version || 1) + 1,
    };
    db.businessState.personalItems = items;
    saveDatabase(db);
    return { item: items[idx], state: db.businessState };
  },

  updateWorkflow(workflow: EdcWorkflow): EdcBusinessState {
    const db = loadDatabase();
    const workflows = [...(db.businessState.workflows || [])];
    const idx = workflows.findIndex((w) => w.id === workflow.id);
    if (idx >= 0) {
      workflows[idx] = {
        ...workflow,
        updatedAt: new Date().toISOString(),
        version: (workflows[idx].version || 1) + 1,
      };
    } else {
      workflows.unshift(workflow);
    }
    db.businessState.workflows = workflows;
    saveDatabase(db);
    return db.businessState;
  },

  addOpportunity(opportunity: Partial<EdcOpportunity>): EdcOpportunity {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const record: EdcOpportunity = {
      id: `opp-${Date.now()}`,
      organizationId: 'org-edc-media',
      createdAt: now,
      updatedAt: now,
      version: 1,
      name: opportunity.name || 'New Revenue Engine',
      problem: opportunity.problem || 'Underserved market gap',
      customer: opportunity.customer || 'Target Enterprise',
      industry: opportunity.industry || 'AI & SaaS',
      buyer: opportunity.buyer || 'CEO / CTO',
      pain: opportunity.pain || 'Manual labor overhead',
      currentSolution: opportunity.currentSolution || 'Spreadsheets / Manual',
      marketSize: opportunity.marketSize || 'TBD',
      estimatedValueUsd: opportunity.estimatedValueUsd || 0,
      competition: opportunity.competition || 'Niche players',
      AIOpportunity: opportunity.AIOpportunity || 'Agentic workflow automation',
      proposedSolution: opportunity.proposedSolution || 'Jarvis-powered autonomous agent',
      aiFeasibility: opportunity.aiFeasibility || 0.8,
      strategicValue: opportunity.strategicValue || 0.8,
      executionDifficulty: opportunity.executionDifficulty || 0.4,
      risk: opportunity.risk || 0.2,
      score: opportunity.score || 50,
      status: (opportunity.status || 'DISCOVERED') as EdcOpportunity['status'],
      source: opportunity.source || 'J.A.R.V.I.S. Opportunity Engine',
      evidence: opportunity.evidence || 'Market sectors intelligence scan',
      researchSources: opportunity.researchSources || [],
    };

    db.businessState.opportunities = [
      record,
      ...(db.businessState.opportunities || []),
    ];
    saveDatabase(db);
    return record;
  },
};
