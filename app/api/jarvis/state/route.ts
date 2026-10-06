import { NextRequest, NextResponse } from 'next/server';
import { JarvisRepository } from '@/lib/database/repository';
import {
  ExecutiveRole,
  issueSessionToken,
  verifySessionToken,
} from '@/lib/security/auth-and-permissions';
import { executeJarvisToolCall } from '@/lib/jarvis/tools/gateway';
import { OperatingScope } from '@/lib/edc-os-config';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('jarvis_session')?.value;
    const rawToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : cookieToken;

    const authContext = verifySessionToken(rawToken);
    const state = JarvisRepository.getState();

    return NextResponse.json({
      ok: true,
      authContext,
      businessState: state,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load state';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      operation,
      toolName,
      args = {},
      approvalId,
      decision,
      role,
      scope,
    }: {
      operation:
        | 'tool'
        | 'resolve_approval'
        | 'switch_role'
        | 'switch_scope';
      toolName?: string;
      args?: Record<string, unknown>;
      approvalId?: string;
      decision?: 'APPROVED' | 'DENIED' | 'DEFERRED';
      role?: ExecutiveRole;
      scope?: OperatingScope;
    } = body;

    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('jarvis_session')?.value;
    const rawToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : cookieToken;

    if (operation === 'switch_role' && role) {
      const newToken = issueSessionToken(role);
      const authContext = verifySessionToken(newToken);
      const res = NextResponse.json({
        ok: true,
        sessionToken: newToken,
        authContext,
        businessState: JarvisRepository.getState(),
      });
      res.cookies.set('jarvis_session', newToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
      return res;
    }

    if (operation === 'switch_scope' && scope) {
      const nextState = JarvisRepository.setScope(scope);
      return NextResponse.json({
        ok: true,
        businessState: nextState,
      });
    }

    if (operation === 'resolve_approval' && approvalId && decision) {
      const { approval, state } = JarvisRepository.resolveApprovalRequest(
        approvalId,
        decision
      );
      return NextResponse.json({
        ok: true,
        approval,
        businessState: state,
      });
    }

    if (operation === 'tool' && toolName) {
      const outcome = await executeJarvisToolCall({
        name: toolName,
        args,
        sessionToken: rawToken,
      });
      return NextResponse.json({
        ok: outcome.result.success,
        toolResult: outcome.result,
        webSearch: outcome.webSearch,
        navigatedView: outcome.navigatedView,
        businessState: JarvisRepository.getState(),
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid state operation' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Mutation error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
