import { EdcOpportunity } from '@/lib/edc-os-config';

export interface AgentContext {
  organizationId: string;
}

export interface ResearchAgent {
  codename: string;
  discoverOpportunities(context: AgentContext, query: string): Promise<EdcOpportunity[]>;
}
