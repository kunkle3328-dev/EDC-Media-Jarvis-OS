
import { EdcOpportunity } from '@/lib/edc-os-config';

export class OpportunityEngine {
  static scoreOpportunity(opportunity: Partial<EdcOpportunity>): number {
    let score = 0;

    // 1. Pain Score (0-20)
    const painLength = (opportunity.problem || '').length;
    if (painLength > 100) score += 20;
    else if (painLength > 50) score += 10;
    else if (painLength > 10) score += 5;

    // 2. Economic Value (0-20)
    const estValue = opportunity.estimatedValueUsd || 0;
    if (estValue > 500000) score += 20;
    else if (estValue > 100000) score += 15;
    else if (estValue > 50000) score += 10;
    else if (estValue > 10000) score += 5;

    // 3. AI Feasibility (0-20)
    const feasibility = opportunity.aiFeasibility || 0.5;
    score += Math.round(feasibility * 20);

    // 4. Strategic Fit (0-20)
    // Assume high fit for now if it involves "Agent" or "Voice"
    const text = (opportunity.name + ' ' + opportunity.problem).toLowerCase();
    if (text.includes('agent') || text.includes('voice') || text.includes('autonomous')) {
      score += 20;
    } else {
      score += 10;
    }

    // 5. Urgency / Market Timing (0-20)
    // Defaulting to 15 for new opportunities
    score += 15;

    return Math.min(100, Math.max(0, score));
  }

  static calculateRevenuePotential(opportunity: Partial<EdcOpportunity>): number {
    return opportunity.estimatedValueUsd || 0;
  }
}
