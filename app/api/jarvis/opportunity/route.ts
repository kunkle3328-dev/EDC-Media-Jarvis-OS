
import { NextRequest, NextResponse } from 'next/server';
import { MarketIntelligenceAgent } from '@/lib/jarvis/agents/market-intelligence';
import { JarvisRepository } from '@/lib/database/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || 'Enterprise AI Opportunities');
    const agent = new MarketIntelligenceAgent();
    const opps = await agent.discoverOpportunities({ organizationId: 'org-edc-media' }, query);
    
    // Persist discovered opportunities to the database
    const savedOpps = opps.map((opp) => JarvisRepository.addOpportunity(opp));

    return NextResponse.json({ 
      success: true,
      opportunities: savedOpps,
      businessState: JarvisRepository.getState(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown opportunity discovery error';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMsg,
        opportunities: [],
        businessState: JarvisRepository.getState(),
      },
      { status: 200 }
    );
  }
}
