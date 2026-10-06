import { GoogleGenAI } from '@google/genai';
import { EdcOpportunity } from '@/lib/edc-os-config';
import { ResearchAgent, AgentContext } from './base';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class MarketIntelligenceAgent implements ResearchAgent {
  codename = 'MARKET_INTELLIGENCE_AGENT';

  async discoverOpportunities(context: AgentContext, query: string): Promise<EdcOpportunity[]> {
    const prompt = `Research and identify 3 high-value B2B AI software opportunities based on this query: "${query}".
    For each, provide: name, problem, customer, industry, buyer, pain, marketSize, estimatedValueUsd.
    Return as a JSON array of objects.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    
    // Parse response
    const data = JSON.parse(response.text || '[]');
    return data.map((o: any) => ({
      ...o,
      id: `opp-${Date.now()}`,
      status: 'DISCOVERED',
      score: 50,
      source: 'MarketIntelligenceAgent',
      evidence: 'Gemini Research',
    }));
  }
}
