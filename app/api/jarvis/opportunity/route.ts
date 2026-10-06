
import { NextRequest, NextResponse } from 'next/server';
import { MarketIntelligenceAgent } from '@/lib/jarvis/agents/market-intelligence';

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const agent = new MarketIntelligenceAgent();
  const opps = await agent.discoverOpportunities({ organizationId: 'org-edc-media' }, query);
  return NextResponse.json({ opportunities: opps });
}
