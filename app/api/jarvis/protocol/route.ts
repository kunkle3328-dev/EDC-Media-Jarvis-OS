import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  getGeminiClient,
  GroundedWebSource,
  performGroundedWebSearch,
} from '@/lib/gemini-server';
import {
  buildJarvisSystemInstruction,
  EXECUTIVE_PROTOCOLS,
  ExecutiveProtocolId,
  VOICE_PERSONAS,
  VoicePersonaId,
} from '@/lib/edc-os-config';
import {
  JarvisRepository,
  recordAuditEvent,
} from '@/lib/database/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      protocolId = 'VALIDATE',
      subject = '',
      voiceId = 'Charon',
      speakVerdict = true,
      useWebSearch = true,
    }: {
      protocolId: ExecutiveProtocolId;
      subject?: string;
      voiceId?: VoicePersonaId;
      speakVerdict?: boolean;
      useWebSearch?: boolean;
    } = body;

    const ai = getGeminiClient();
    const persona =
      VOICE_PERSONAS.find((v) => v.id === voiceId) || VOICE_PERSONAS[0];
    const protocolSpec =
      EXECUTIVE_PROTOCOLS.find((p) => p.id === protocolId) ||
      EXECUTIVE_PROTOCOLS[0];

    const authoritativeState = JarvisRepository.getState();
    const targetSubject = subject.trim() || protocolSpec.defaultSubject;
    const systemInstruction = buildJarvisSystemInstruction(
      persona,
      authoritativeState,
      'strategic_brief'
    );

    let liveWebContext = '';
    let webSources: GroundedWebSource[] = [];
    if (useWebSearch) {
      try {
        const searchRes = await performGroundedWebSearch(
          `${targetSubject} market size pricing competitors 2026`
        );
        liveWebContext = `\n\nLIVE GOOGLE SEARCH MARKET INTELLIGENCE:\n${searchRes.summary}`;
        webSources = searchRes.sources;
      } catch (e) {
        console.warn('Protocol web search warning:', e);
      }
    }

    const prompt = `Execute the "${protocolSpec.id}" Executive Protocol for EDC Media on the following initiative/subject:
"${targetSubject}"

Protocol Mandate: ${protocolSpec.tagline}
Value Chain Focus: ${protocolSpec.chainFocus}${liveWebContext}

Be ruthlessly analytical. Do not flatter weak assumptions. Connect Market -> Problem -> Product -> AI -> Agents -> Technology -> Distribution -> Sales -> Pricing -> Retention -> Profit -> Scale.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Executive title of the strategic dossier.',
            },
            spokenBriefing: {
              type: Type.STRING,
              description:
                'A 3-sentence natural spoken executive verdict delivered by JARVIS out loud (no markdown symbols).',
            },
            projectedImpactMetric: {
              type: Type.STRING,
              description:
                'Quantified financial or operational leverage impact (e.g., "+$32K MRR · 84% Gross Margin · 1.8 mo Payback").',
            },
            eightDimensions: {
              type: Type.OBJECT,
              properties: {
                opportunity: { type: Type.STRING },
                competitive: { type: Type.STRING },
                customer: { type: Type.STRING },
                technical: { type: Type.STRING },
                economic: { type: Type.STRING },
                goToMarket: { type: Type.STRING },
                risk: { type: Type.STRING },
                scalability: { type: Type.STRING },
              },
              required: [
                'opportunity',
                'competitive',
                'customer',
                'technical',
                'economic',
                'goToMarket',
                'risk',
                'scalability',
              ],
            },
            verdictMatrix: {
              type: Type.OBJECT,
              properties: {
                whatIsStrong: { type: Type.STRING },
                whatIsWeak: { type: Type.STRING },
                whatIsMissing: { type: Type.STRING },
                whatShouldChange: { type: Type.STRING },
                whatShouldBeBuilt: { type: Type.STRING },
                whatShouldNotBeBuilt: { type: Type.STRING },
              },
              required: [
                'whatIsStrong',
                'whatIsWeak',
                'whatIsMissing',
                'whatShouldChange',
                'whatShouldBeBuilt',
                'whatShouldNotBeBuilt',
              ],
            },
            executiveConclusion: {
              type: Type.OBJECT,
              properties: {
                decisionFramework: { type: Type.STRING },
                keyFactsAssumptions: { type: Type.STRING },
                recommendedNextMoves: { type: Type.STRING },
                buildExecutionPlan: { type: Type.STRING },
                businessModel: { type: Type.STRING },
                revenueLevers: { type: Type.STRING },
                risks: { type: Type.STRING },
                immediateNextAction: { type: Type.STRING },
              },
              required: [
                'decisionFramework',
                'keyFactsAssumptions',
                'recommendedNextMoves',
                'buildExecutionPlan',
                'businessModel',
                'revenueLevers',
                'risks',
                'immediateNextAction',
              ],
            },
          },
          required: [
            'title',
            'spokenBriefing',
            'projectedImpactMetric',
            'eightDimensions',
            'verdictMatrix',
            'executiveConclusion',
          ],
        },
      },
    });

    const rawJson = (response.text || '{}').trim();
    const dossier = JSON.parse(rawJson);

    // Persist directive & decision memory in authoritative database
    JarvisRepository.addDirective({
      id: `dir-${Date.now()}`,
      timestamp: 'Verified Live',
      protocol: protocolSpec.id,
      title: String(dossier.title || `${protocolSpec.id}: ${targetSubject}`),
      summary: String(
        dossier.spokenBriefing ||
          dossier.executiveConclusion?.immediateNextAction ||
          'Executed strategic protocol.'
      ),
      impactMetric: String(
        dossier.projectedImpactMetric || '+High Leverage Impact'
      ),
      status: 'Executed',
    });

    JarvisRepository.addMemory({
      layer: 'BUSINESS',
      kind: 'DECISION',
      scope: 'BUSINESS',
      title: `${protocolSpec.id} Dossier: ${dossier.title || targetSubject}`,
      content: `${dossier.spokenBriefing || ''} | Next Action: ${dossier.executiveConclusion?.immediateNextAction || ''}`,
      confidence: 0.96,
      source: `Strategic Protocol Matrix (${protocolSpec.id})`,
      sensitivity: 'INTERNAL',
    });

    recordAuditEvent({
      actor: 'J.A.R.V.I.S. Strategic Matrix',
      actorType: 'ai',
      action: `PROTOCOL_${protocolSpec.id}`,
      target: String(dossier.title || targetSubject),
      toolName: 'executeStrategicProtocol',
      parameters: { protocolId: protocolSpec.id, subject: targetSubject },
      resultStatus: 'SUCCESS',
      summary: `Generated and persisted ${protocolSpec.id} dossier (${dossier.projectedImpactMetric || 'Verified'})`,
    });

    let audioWavBase64: string | null = null;
    if (speakVerdict && dossier.spokenBriefing) {
      try {
        const cleanSpoken = String(dossier.spokenBriefing)
          .replace(/[*#_`~>]/g, '')
          .trim();
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanSpoken,
                  // @ts-ignore - speechMetadata supported on Gemini 3.8 TTS
                  speechMetadata: {
                    style: persona.styleDirective,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: persona.id },
              },
            },
          },
        });
        audioWavBase64 =
          ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
          null;
      } catch (ttsErr) {
        console.error('Protocol TTS warning:', ttsErr);
      }
    }

    return NextResponse.json({
      protocolId: protocolSpec.id,
      subject: targetSubject,
      dossier,
      webSources,
      audioWavBase64,
      businessState: JarvisRepository.getState(),
    });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : 'Protocol execution error';
    console.error('Error in /api/jarvis/protocol:', error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
