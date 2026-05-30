/**
 * LLM Prompt Templates (Master Prompt Architecture)
 * Consolidates all insights into a single JSON response.
 * Strictly aligned with insight.validator.ts Zod schemas.
 */

import { ActivityTimelineInsightData } from "@/types/insight.types";

/**
 * Builds a highly optimized, entity-enriched context for the LLM
 * Maximizes context without sending raw logs.
 */
export const buildMasterContext = (
  findings: any[],
  timelineData: ActivityTimelineInsightData,
): string => {
  // 1. Severity Summary
  const severityCounts = {
    CRITICAL: findings.filter((f) => f.severity === "CRITICAL").length,
    HIGH: findings.filter((f) => f.severity === "HIGH").length,
    MEDIUM: findings.filter((f) => f.severity === "MEDIUM").length,
    LOW: findings.filter((f) => f.severity === "LOW").length,
  };

  // 2. Aggregate Top Attacking Entities (Context-Aware Entity Scanner)
  const entityCounts = new Map<string, number>();
  findings.forEach(f => {
    if (f.affected_entities) {
      for (const [key, value] of Object.entries(f.affected_entities)) {
        if (key.includes('ip') || key.includes('user') || key.includes('attacker') || key.includes('source')) {
          if (typeof value === 'string' && value !== "unknown" && value.trim() !== "") {
            entityCounts.set(value, (entityCounts.get(value) || 0) + 1);
          } else if (Array.isArray(value)) {
            value.forEach(v => {
              if (typeof v === 'string' && v !== "unknown" && v.trim() !== "") {
                entityCounts.set(v, (entityCounts.get(v) || 0) + 1);
              }
            });
          }
        }
      }
    }
  });

  const topEntities = Array.from(entityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([entity, count]) => `${entity} (${count} threats)`)
    .join(", ");

  // 3. Finding Details (Enriched with Evidence!)
  // Sort by severity so the LLM pays attention to the most critical items first
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  const sortedFindings = [...findings].sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

  // Cap at top 60 findings to avoid token limits, but prioritize the critical ones
  const criticalFindingsList = sortedFindings.slice(0, 60).map((f) => {
    let findingStr = `- [${f.severity}] ${f.finding_type}: ${f.summary || "No summary"}\n`;
    findingStr += `  Analyzer Engine: ${f.analyzer} | Confidence: ${(f.confidence * 100).toFixed(1)}%\n`;
    
    // INJECT THE RICH EVIDENCE SO THE LLM SEES THE MATH & EXPLOITS
    if (f.evidence && Object.keys(f.evidence).length > 0) {
      findingStr += `  Evidence: ${JSON.stringify(f.evidence)}\n`;
    }
    return findingStr;
  }).join("\n");

  return `
--- SECURITY ANALYSIS CONTEXT ---
TOTAL THREATS DETECTED: ${findings.length}
SEVERITY BREAKDOWN: CRITICAL:${severityCounts.CRITICAL}, HIGH:${severityCounts.HIGH}, MEDIUM:${severityCounts.MEDIUM}, LOW:${severityCounts.LOW}

TOP THREAT ACTORS (IPs/Users):
${topEntities || "None clearly identified"}

KEY FINDINGS (Top 60 by Severity, including forensic evidence):
${criticalFindingsList || "No specific findings generated."}

TIMELINE SUMMARY:
Total Events Analyzed: ${timelineData.total_events}
Time Range: ${timelineData.time_range.start} to ${timelineData.time_range.end}
---------------------------------
  `.trim();
};

export const masterInsightPrompt = `
You are an elite enterprise security analyst and incident responder. Review the provided SECURITY ANALYSIS CONTEXT.
Your task is to synthesize the raw analyzer findings and forensic evidence into a comprehensive, executive-level security report.

You MUST respond with a single, valid JSON object exactly matching the schema below.
DO NOT include markdown formatting (like \`\`\`json) or any outside text. ONLY return the raw JSON object.

SCHEMA REQUIREMENTS:
{
  "OVERVIEW": {
    "executive_summary": "<String: A professional 3-4 sentence high-level summary of the entire incident or security posture>",
    "overall_risk_score": <Number: 0-100 based on severity and volume of findings>,
    "primary_threat_vector": "<String: Short description of the main method of attack or most significant risk>"
  },
  "THREAT_SUMMARY": {
    "critical_threats": [
      {
        "name": "<String: Name of the threat>",
        "description": "<String: 1-2 sentence description>",
        "affected_systems": ["<String: endpoint/system 1>"]
      }
    ],
    "high_threats": [
      {
        "name": "<String: Name of the threat>",
        "description": "<String: 1-2 sentence description>",
        "affected_systems": ["<String: endpoint/system 1>"]
      }
    ]
  },
  "RECOMMENDATION": {
    "immediate_actions": [
      {
        "title": "<String: short action title>",
        "priority": "<Enum: CRITICAL or HIGH>",
        "description": "<String: 1 sentence description of what to do to stop the active threats>",
        "actions": ["<String: action 1>", "<String: action 2>"],
        "impact": "<String: expected positive impact>"
      }
    ],
    "long_term_actions": [
      {
        "title": "<String: short action title>",
        "priority": "<Enum: HIGH or MEDIUM>",
        "description": "<String: 1 sentence description>",
        "actions": ["<String: action 1>"],
        "impact": "<String: expected positive impact>"
      }
    ]
  },
  "ATTACK_PATTERN": {
    "pattern_type": "<String: name of the most prominent attack pattern observed>",
    "description": "<String: 2 sentence description of the attacker methodology based on findings>",
    "affected_endpoints": ["<String: endpoint 1>", "<String: endpoint 2>"],
    "attack_flow": ["<String: step 1>", "<String: step 2>"],
    "severity": "<Enum: CRITICAL, HIGH, MEDIUM, or LOW>",
    "confidence_score": <Number: float between 0.0 and 1.0>,
    "likely_goals": ["<String: goal 1>", "<String: goal 2>"]
  },
  "ANOMALOUS_BEHAVIOR_SUMMARY": {
    "anomaly_type": "<String: type of primary anomaly detected (e.g., Exfiltration, Velocity, Bot)>",
    "description": "<String: 2 sentence description of the unusual behavior derived from Statistical, Temporal, or ML analyzers>",
    "confidence_score": <Number: float between 0.0 and 1.0>,
    "affected_entities": ["<String: entity 1>", "<String: entity 2>"]
  }
}
`;