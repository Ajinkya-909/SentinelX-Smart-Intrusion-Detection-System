/**
 * LLM Prompt Templates
 * Structured prompts for Gemini to generate insights from security data
 */

import { ActivityTimelineInsightData } from "@/types/insight.types";

/**
 * Build context for LLM insight generation
 */
export const buildLLMContext = (
  findings: any[],
  timelineData: ActivityTimelineInsightData,
): string => {
  const findingsText = findings
    .slice(0, 50) // Limit to top 50 findings
    .map(
      (f) =>
        `- Type: ${f.finding_type} | Severity: ${f.severity} | Confidence: ${f.confidence || "N/A"} | Summary: ${
          f.summary || "No summary"
        }`,
    )
    .join("\n");

  const timelineText = `Total events: ${timelineData.total_events} | Peak time: ${
    timelineData.points[0]?.timestamp || "N/A"
  }`;

  return `
SECURITY ANALYSIS CONTEXT
========================

ANALYZER FINDINGS (Sample):
${findingsText}

ACTIVITY TIMELINE:
${timelineText}

TIME RANGE: ${timelineData.time_range.start} to ${timelineData.time_range.end}
`;
};

/**
 * Template for OVERVIEW insight
 */
export const overviewPrompt = (context: string, findings: any[]): string => {
  const criticalCount = findings.filter(
    (f) => f.severity === "CRITICAL",
  ).length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const totalThreats = findings.length;

  return `${context}

You are a cybersecurity expert analyzing log data for threats.

Generate a structured OVERVIEW insight with the following JSON format (MUST be valid JSON):
{
  "summary": "<executive summary of the security posture in 2-3 sentences>",
  "threat_level": "<one of: CRITICAL, HIGH, MEDIUM, LOW>",
  "total_threats": ${totalThreats},
  "affected_systems": <number of unique systems affected>,
  "key_findings": [
    "<finding 1>",
    "<finding 2>",
    "<finding 3>"
  ]
}

CRITICAL: ${criticalCount} findings | HIGH: ${highCount} findings | TOTAL: ${totalThreats} findings

Analyze the findings and provide a concise executive summary. Classify the overall threat level based on the severity distribution.

Return ONLY the JSON object, no other text.`;
};

/**
 * Template for THREAT_SUMMARY insight
 */
export const threatSummaryPrompt = (
  context: string,
  findings: any[],
): string => {
  const severityCounts = {
    CRITICAL: findings.filter((f) => f.severity === "CRITICAL").length,
    HIGH: findings.filter((f) => f.severity === "HIGH").length,
    MEDIUM: findings.filter((f) => f.severity === "MEDIUM").length,
    LOW: findings.filter((f) => f.severity === "LOW").length,
  };

  const topFindings = findings
    .slice(0, 10)
    .map((f) => `- ${f.finding_type}: ${f.summary || "N/A"}`)
    .join("\n");

  return `${context}

You are a cybersecurity analyst providing threat intelligence.

Generate a structured THREAT_SUMMARY insight with JSON format:
{
  "overall_threat_classification": "<one of: CRITICAL, HIGH, MEDIUM, LOW>",
  "threat_count": ${findings.length},
  "critical_threats": ${severityCounts.CRITICAL},
  "high_threats": ${severityCounts.HIGH},
  "summary_narrative": "<detailed threat narrative paragraph>",
  "immediate_concerns": [
    "<concern 1>",
    "<concern 2>",
    "<concern 3>"
  ]
}

SEVERITY BREAKDOWN:
- CRITICAL: ${severityCounts.CRITICAL}
- HIGH: ${severityCounts.HIGH}
- MEDIUM: ${severityCounts.MEDIUM}
- LOW: ${severityCounts.LOW}

TOP FINDINGS:
${topFindings}

Provide a narrative threat assessment including immediate concerns that require attention.

Return ONLY the JSON object, no other text.`;
};

/**
 * Template for RECOMMENDATION insight
 */
export const recommendationPrompt = (
  context: string,
  findings: any[],
): string => {
  const criticalFinding = findings.find((f) => f.severity === "CRITICAL");
  const topThreats = findings
    .slice(0, 5)
    .map((f) => `- ${f.finding_type}`)
    .join("\n");

  return `${context}

You are a cybersecurity remediation expert.

Generate a structured RECOMMENDATION insight with JSON format:
{
  "recommendations": [
    {
      "title": "<short action title>",
      "priority": "<one of: CRITICAL, HIGH, MEDIUM, LOW>",
      "description": "<detailed description of why this is needed>",
      "actions": [
        "<specific action 1>",
        "<specific action 2>"
      ],
      "impact": "<expected impact of implementing this>"
    }
  ]
}

CRITICAL FINDINGS DETECTED:
${topThreats}

${
  criticalFinding
    ? `CRITICAL FINDING: ${criticalFinding.finding_type}\nRecommendation from analyzer: ${
        criticalFinding.recommendation || "None provided"
      }`
    : "No critical findings"
}

Generate 3-5 prioritized remediation recommendations based on the threat landscape. Focus on immediate mitigation for critical threats and then preventive measures.

Return ONLY the JSON object, no other text.`;
};

/**
 * Template for ATTACK_PATTERN insight
 */
export const attackPatternPrompt = (
  context: string,
  findings: any[],
): string => {
  const patternFindings = findings
    .filter(
      (f) =>
        f.finding_type?.includes("brute") || f.finding_type?.includes("attack"),
    )
    .slice(0, 10)
    .map((f) => `- ${f.finding_type}: ${f.summary || "N/A"}`)
    .join("\n");

  return `${context}

You are a threat intelligence analyst specializing in attack pattern analysis.

Generate a structured ATTACK_PATTERN insight with JSON format:
{
  "pattern_type": "<name of the attack pattern, e.g., 'Brute Force', 'Port Scanning', 'SQL Injection Attempt'>",
  "description": "<detailed description of the observed attack pattern>",
  "affected_endpoints": [
    "<endpoint 1>",
    "<endpoint 2>"
  ],
  "attack_flow": [
    "<step 1 of attack>",
    "<step 2 of attack>"
  ],
  "severity": "<one of: CRITICAL, HIGH, MEDIUM, LOW>",
  "confidence_score": <0.0 to 1.0>,
  "likely_goals": [
    "<potential attacker goal 1>",
    "<potential attacker goal 2>"
  ]
}

ATTACK-RELATED FINDINGS:
${patternFindings || "No clear attack patterns identified"}

Analyze the findings to identify coordinated attack patterns. Describe the likely attack methodology, progression, and objectives.

Return ONLY the JSON object, no other text.`;
};

/**
 * Template for ANOMALY_SUMMARY insight
 */
export const anomalySummaryPrompt = (
  context: string,
  findings: any[],
): string => {
  const anomalousFindings = findings
    .slice(0, 15)
    .map((f) => `- ${f.summary || f.finding_type}`)
    .join("\n");

  return `${context}

You are an anomaly detection expert analyzing unusual security events.

Generate a structured ANOMALY_SUMMARY insight with JSON format:
{
  "anomaly_type": "<type of anomaly detected>",
  "description": "<what makes this behavior anomalous>",
  "confidence_score": <0.0 to 1.0>,
  "affected_entities": [
    "<entity 1>",
    "<entity 2>"
  ],
  "deviation_from_baseline": "<how this deviates from normal behavior>",
  "recommended_action": "<recommended investigative or defensive action>",
  "severity": "<one of: CRITICAL, HIGH, MEDIUM, LOW>"
}

ANOMALOUS FINDINGS:
${anomalousFindings}

Identify patterns that deviate from normal security behavior. Explain why these patterns are anomalous and recommend investigative steps.

Return ONLY the JSON object, no other text.`;
};

/**
 * Generate prompt for multiple insights in one call
 * Useful for batching multiple insight types together
 */
export const batchInsightPrompt = (
  context: string,
  findings: any[],
  insightTypesRequested: string[],
): string => {
  return `${context}

You are a comprehensive cybersecurity analysis system.

Based on the analyzer findings above, generate the following insights as a JSON object:

{
  "insights": {
    ${
      insightTypesRequested.includes("overview")
        ? `"overview": ${JSON.stringify({ summary: "", threat_level: "", total_threats: 0, affected_systems: 0, key_findings: [] })},`
        : ""
    }
    ${
      insightTypesRequested.includes("threat_summary")
        ? `"threat_summary": ${JSON.stringify({
            overall_threat_classification: "",
            threat_count: 0,
            critical_threats: 0,
            high_threats: 0,
            summary_narrative: "",
            immediate_concerns: [],
          })},`
        : ""
    }
    ${
      insightTypesRequested.includes("recommendation")
        ? `"recommendation": ${JSON.stringify({ recommendations: [] })},`
        : ""
    }
    ${
      insightTypesRequested.includes("attack_pattern")
        ? `"attack_pattern": ${JSON.stringify({
            pattern_type: "",
            description: "",
            affected_endpoints: [],
            attack_flow: [],
            severity: "",
            confidence_score: 0,
            likely_goals: [],
          })},`
        : ""
    }
    ${
      insightTypesRequested.includes("anomaly_summary")
        ? `"anomaly_summary": ${JSON.stringify({
            anomaly_type: "",
            description: "",
            confidence_score: 0,
            affected_entities: [],
            deviation_from_baseline: "",
            recommended_action: "",
            severity: "",
          })}`
        : ""
    }
  }
}

Analyze the security findings and populate ONLY the requested insight types with accurate, actionable intelligence.

Return ONLY the JSON object, no other text.`;
};
