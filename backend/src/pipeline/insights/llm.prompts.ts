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

  // 2. Aggregate Top Attacking IPs (Token Optimized)
  const ipCounts = new Map<string, number>();
  findings.forEach(f => {
    if (f.affected_entities?.ips) {
      f.affected_entities.ips.forEach((ip: string) => ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1));
    }
  });
  const topIps = Array.from(ipCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ip, count]) => `${ip} (${count} threats)`)
    .join(", ");

  // 3. Extract Top 15 Most Relevant Findings
  const priorityFindings = findings
    .sort((a, b) => {
      const severityWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
      return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
    })
    .slice(0, 15)
    .map((f) => `- [${f.severity}] ${f.finding_type}: ${f.summary || "No summary"}`)
    .join("\n");

  return `
SECURITY PIPELINE TELEMETRY
========================
Time Range: ${timelineData.time_range.start} to ${timelineData.time_range.end}
Total Events Analyzed: ${timelineData.total_events}
Total Threats Detected: ${findings.length}
Severity Breakdown: CRITICAL=${severityCounts.CRITICAL}, HIGH=${severityCounts.HIGH}, MEDIUM=${severityCounts.MEDIUM}, LOW=${severityCounts.LOW}

Top Suspicious IPs:
${topIps || "None identified"}

Highest Priority Findings:
${priorityFindings}
`;
};

/**
 * The Master Prompt: Requests all 5 insights in a single, strictly formatted JSON payload.
 * Types (String vs Number vs Array) must be strictly respected to pass Zod validation.
 */
export const masterInsightPrompt = (context: string): string => {
  return `
You are an elite Lead Cybersecurity Analyst. Review the following security telemetry and generate a comprehensive threat intelligence report.

${context}

INSTRUCTIONS:
Analyze the telemetry and generate exactly 5 distinct security insights. 
You MUST respond with a single valid JSON object containing exactly the structure requested below. 
Pay strict attention to data types. Do NOT wrap numbers or booleans in quotes. Enums must match exactly.

REQUIRED JSON STRUCTURE:
{
  "OVERVIEW": {
    "summary": "<String: 2-3 sentence executive summary of the overall security status>",
    "threat_level": "<Enum: CRITICAL, HIGH, MEDIUM, or LOW>",
    "total_threats": <Number: Extract from Total Threats Detected in context>,
    "affected_systems": <Number: Estimate of unique systems/endpoints affected>,
    "key_findings": ["<String: finding 1>", "<String: finding 2>", "<String: finding 3>"]
  },
  "THREAT_SUMMARY": {
    "overall_threat_classification": "<Enum: CRITICAL, HIGH, MEDIUM, or LOW>",
    "threat_count": <Number: Extract from Total Threats Detected in context>,
    "critical_threats": <Number: Extract from CRITICAL count in context>,
    "high_threats": <Number: Extract from HIGH count in context>,
    "summary_narrative": "<String: 2 sentence overall threat assessment narrative>",
    "immediate_concerns": ["<String: specific concern 1>", "<String: specific concern 2>"]
  },
  "RECOMMENDATION": {
    "recommendations": [
      {
        "title": "<String: short action title>",
        "priority": "<Enum: CRITICAL, HIGH, MEDIUM, or LOW>",
        "description": "<String: 1 sentence description referencing specific IPs or threats>",
        "actions": ["<String: action 1>", "<String: action 2>"],
        "impact": "<String: expected positive impact>"
      },
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
  "ANOMALY_SUMMARY": {
    "anomaly_type": "<String: type of primary anomaly detected>",
    "description": "<String: 2 sentence description of the unusual behavior>",
    "confidence_score": <Number: float between 0.0 and 1.0>,
    "affected_entities": ["<String: entity 1>", "<String: entity 2>"],
    "deviation_from_baseline": "<String: how this deviates from normal behavior>",
    "recommended_action": "<String: recommended investigative action>",
    "severity": "<Enum: CRITICAL, HIGH, MEDIUM, or LOW>"
  }
}
`;
};