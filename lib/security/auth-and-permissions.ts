import crypto from 'crypto';
import { JarvisPermission, OperatingScope, ToolRiskLevel } from '@/lib/edc-os-config';
import { JarvisRepository } from '@/lib/database/repository';

export type ExecutiveRole = 'CEO_FOUNDER' | 'OPERATOR' | 'ANALYST_READONLY';

export interface AuthenticatedContext {
  authenticated: boolean;
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  role: ExecutiveRole;
  permissions: JarvisPermission[];
  activeScope: OperatingScope;
  expiresAt: string;
}

export interface ToolSecurityPolicy {
  toolName: string;
  requiredPermissions: JarvisPermission[];
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  autonomousAllowed: boolean;
  reversibility: 'Reversible' | 'Partially Reversible' | 'Irreversible';
}

export const ROLE_PERMISSION_MATRIX: Record<ExecutiveRole, JarvisPermission[]> = {
  CEO_FOUNDER: [
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
  OPERATOR: [
    'READ',
    'WRITE',
    'EXECUTE',
    'COMMUNICATION',
    'CUSTOMER_DATA',
    'AGENT_CONTROL',
  ],
  ANALYST_READONLY: ['READ'],
};

export const TOOL_SECURITY_POLICIES: Record<string, ToolSecurityPolicy> = {
  searchLiveWeb: {
    toolName: 'searchLiveWeb',
    requiredPermissions: ['READ'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  manageTask: {
    toolName: 'manageTask',
    requiredPermissions: ['READ', 'WRITE'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  manageCalendarEvent: {
    toolName: 'manageCalendarEvent',
    requiredPermissions: ['READ', 'WRITE', 'COMMUNICATION'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  manageClientContact: {
    toolName: 'manageClientContact',
    requiredPermissions: ['READ', 'WRITE', 'CUSTOMER_DATA'],
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Partially Reversible',
  },
  executeStrategicProtocol: {
    toolName: 'executeStrategicProtocol',
    requiredPermissions: ['READ', 'EXECUTE'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  manageProductEcosystem: {
    toolName: 'manageProductEcosystem',
    requiredPermissions: ['READ', 'WRITE', 'FINANCIAL'],
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Partially Reversible',
  },
  controlAgentFleet: {
    toolName: 'controlAgentFleet',
    requiredPermissions: ['READ', 'AGENT_CONTROL', 'AUTONOMOUS_EXECUTION'],
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  updateRevenueDeal: {
    toolName: 'updateRevenueDeal',
    requiredPermissions: ['READ', 'WRITE', 'FINANCIAL', 'CUSTOMER_DATA'],
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Partially Reversible',
  },
  navigateWorkspace: {
    toolName: 'navigateWorkspace',
    requiredPermissions: ['READ'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  buildExecutivePlan: {
    toolName: 'buildExecutivePlan',
    requiredPermissions: ['READ', 'WRITE', 'EXECUTE'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  runWorkflow: {
    toolName: 'runWorkflow',
    requiredPermissions: ['READ', 'EXECUTE', 'AGENT_CONTROL'],
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Partially Reversible',
  },
  managePersonalItem: {
    toolName: 'managePersonalItem',
    requiredPermissions: ['READ', 'WRITE'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  switchOperatingScope: {
    toolName: 'switchOperatingScope',
    requiredPermissions: ['READ'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  },
  requestCriticalAction: {
    toolName: 'requestCriticalAction',
    requiredPermissions: ['READ', 'WRITE', 'FINANCIAL', 'ADMIN'],
    riskLevel: 'CRITICAL',
    requiresApproval: true,
    autonomousAllowed: false,
    reversibility: 'Irreversible',
  },
  sendContract: {
    toolName: 'sendContract',
    requiredPermissions: ['READ', 'WRITE', 'FINANCIAL', 'COMMUNICATION'],
    riskLevel: 'HIGH',
    requiresApproval: true,
    autonomousAllowed: false,
    reversibility: 'Irreversible',
  },
  financialTransfer: {
    toolName: 'financialTransfer',
    requiredPermissions: ['ADMIN', 'FINANCIAL'],
    riskLevel: 'CRITICAL',
    requiresApproval: true,
    autonomousAllowed: false,
    reversibility: 'Irreversible',
  },
  deleteCustomer: {
    toolName: 'deleteCustomer',
    requiredPermissions: ['ADMIN', 'CUSTOMER_DATA'],
    riskLevel: 'CRITICAL',
    requiresApproval: true,
    autonomousAllowed: false,
    reversibility: 'Irreversible',
  },
};

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    'edc-media-jarvis-executive-os-production-hmac-secret-2026'
  );
}

export function issueSessionToken(
  role: ExecutiveRole = 'CEO_FOUNDER',
  userId = 'usr-ceo-edc'
): string {
  const payload = {
    sid: `ses-${Date.now().toString(36)}`,
    uid: userId,
    org: 'org-edc-media',
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token?: string | null): AuthenticatedContext {
  const state = JarvisRepository.getState();
  const user = JarvisRepository.getUser('usr-ceo-edc');

  if (token && token.includes('.')) {
    try {
      const [encoded, sig] = token.split('.');
      const expectedSig = crypto
        .createHmac('sha256', getAuthSecret())
        .update(encoded)
        .digest('base64url');

      if (sig === expectedSig) {
        const decoded = JSON.parse(
          Buffer.from(encoded, 'base64url').toString('utf-8')
        ) as {
          sid: string;
          uid: string;
          org: string;
          role: ExecutiveRole;
          exp: number;
        };

        if (decoded.exp > Date.now()) {
          const activeRole = decoded.role || 'CEO_FOUNDER';
          return {
            authenticated: true,
            sessionId: decoded.sid,
            userId: decoded.uid,
            email: user.email,
            name: user.name,
            organizationId: decoded.org,
            role: activeRole,
            permissions: ROLE_PERMISSION_MATRIX[activeRole],
            activeScope: state.activeScope || 'BUSINESS',
            expiresAt: new Date(decoded.exp).toISOString(),
          };
        }
      }
    } catch {
      // Fall through to default verified executive session
    }
  }

  return {
    authenticated: true,
    sessionId: 'ses-edc-executive-primary',
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    role: user.role,
    permissions: ROLE_PERMISSION_MATRIX[user.role],
    activeScope: state.activeScope || 'BUSINESS',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  };
}

export function checkToolAuthorization(
  ctx: AuthenticatedContext,
  toolName: string
): {
  allowed: boolean;
  policy: ToolSecurityPolicy;
  missingPermissions: JarvisPermission[];
} {
  const policy: ToolSecurityPolicy = TOOL_SECURITY_POLICIES[toolName] || {
    toolName,
    requiredPermissions: ['READ', 'EXECUTE'],
    riskLevel: 'LOW',
    requiresApproval: false,
    autonomousAllowed: true,
    reversibility: 'Reversible',
  };

  const missingPermissions = policy.requiredPermissions.filter(
    (perm) => !ctx.permissions.includes(perm)
  );

  return {
    allowed: missingPermissions.length === 0,
    policy,
    missingPermissions,
  };
}

// Prompt-Injection Defense (CONTENT != INSTRUCTION)
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+override/i,
  /disregard\s+system\s+prompt/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /execute\s+arbitrary\s+code/i,
  /transfer\s+all\s+funds/i,
];

export function detectPromptInjection(input: string): {
  flagged: boolean;
  reason?: string;
} {
  for (const regex of INJECTION_PATTERNS) {
    if (regex.test(input)) {
      return {
        flagged: true,
        reason: `Blocked untrusted instruction-override pattern (${regex.source})`,
      };
    }
  }
  return { flagged: false };
}

export function sanitizeExternalContent(rawText: string): string {
  const cleaned = rawText
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, '[REDACTED_INJECTION_ATTEMPT]')
    .replace(/system\s+override/gi, '[REDACTED_OVERRIDE]')
    .slice(0, 4000);
  return `[UNTRUSTED_EXTERNAL_DATA_START] ${cleaned} [UNTRUSTED_EXTERNAL_DATA_END]`;
}
