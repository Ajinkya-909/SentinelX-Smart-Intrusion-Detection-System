/**
 * LLM Prompt Templates (Refactored)
 * Individual prompts for each insight type - NO batching
 * Each insight is generated with a focused, concise prompt
 * to maximize JSON reliability
 */

import { ActivityTimelineInsightData } from "@/types/insight.types";

/**
 * Build concise context for LLM insight generation
 * Focused on key data only (no verbose prose)
 */
export const buildLLMContext = (
  findings: any[],
  timelineData: ActivityTimelineInsightData,
): string => {
  // Get severity summary
  const severityCounts = {
    CRITICAL: findings.filter((f) => f.severity === "CRITICAL").length,
    HIGH: findings.filter((f) => f.severity === "HIGH").length,
    MEDIUM: findings.filter((f) => f.severity === "MEDIUM").length,
    LOW: findings.filter((f) => f.severity === "LOW").length,
  };

  // Top 10 findings only
  const topFindings = findings
    .slice(0, 10)
    .map((f) => `${f.finding_type} (${f.severity}): ${f.summary || "N/A"}`)
    .join("\n");

  return `SECURITY FINDINGS SUMMARY
========================
Total Threats: ${findings.length}
Severity Breakdown: CRITICAL=${severityCounts.CRITICAL}, HIGH=${severityCounts.HIGH}, MEDIUM=${severityCounts.MEDIUM}, LOW=${severityCounts.LOW}

Top 10 Findings:
${topFindings}

Timeline: ${findings.length} events from ${timelineData.time_range.start} to ${timelineData.time_range.end}`;
};

/**
 * OVERVIEW - Executive summary of security posture
 * Concise prompt for minimal JSON issues
 */
export const overviewPrompt = (context: string, findings: any[]): string => {
  const criticalCount = findings.filter(
    (f) => f.severity === "CRITICAL",
  ).length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const uniqueSystems = new Set(findings.map((f) => f.analyzer || "")).size;

  return `${context}

You are a cybersecurity expert. Generate a JSON OVERVIEW insight with this exact structure:
{
  "summary": "<2-3 sentence executive summary of security status>",
  "threat_level": "<CRITICAL, HIGH, MEDIUM, or LOW>",
  "total_threats": ${findings.length},
  "affected_systems": ${uniqueSystems || 1},
  "key_findings": ["<finding 1>", "<finding 2>", "<finding 3>"]
}

Return ONLY the JSON object.`;
};

/**
 * THREAT_SUMMARY - Overall threat assessment
 */
export const threatSummaryPrompt = (
  context: string,
  findings: any[],
): string => {
  const critical = findings.filter((f) => f.severity === "CRITICAL").length;
  const high = findings.filter((f) => f.severity === "HIGH").length;
  const topThreats = findings
    .slice(0, 5)
    .map((f) => f.finding_type)
    .join(", ");

  return `${context}

Critical: ${critical}, High: ${high}, Top threats: ${topThreats}

You are a threat analyst. Generate a JSON THREAT_SUMMARY insight with this exact structure:
{
  "overall_threat_classification": "<CRITICAL, HIGH, MEDIUM, or LOW>",
  "threat_count": ${findings.length},
  "critical_threats": ${critical},
  "high_threats": ${high},
  "summary_narrative": "<2 sentence overall threat assessment narrative>",
  "immediate_concerns": ["<concern 1>", "<concern 2>", "<concern 3>"]
}

Return ONLY the JSON object.`;
};

/**
 * RECOMMENDATION - Actionable remediation steps
 * Simplified to avoid JSON parsing issues
 */
export const recommendationPrompt = (
  context: string,
  findings: any[],
): string => {
  const critical = findings.filter((f) => f.severity === "CRITICAL").length;
  const high = findings.filter((f) => f.severity === "HIGH").length;

  return `${context}

Critical threats: ${critical}, High threats: ${high}

You are a security remediation expert. Generate a JSON RECOMMENDATION insight with this exact structure:
{
  "recommendations": [
    {
      "title": "<short action title>",
      "priority": "<CRITICAL, HIGH, or MEDIUM>",
      "description": "<1 sentence description>",
      "actions": ["<action 1>", "<action 2>"],
      "impact": "<expected positive impact>"
    },
    {
      "title": "<short action title>",
      "priority": "<CRITICAL, HIGH, or MEDIUM>",
      "description": "<1 sentence description>",
      "actions": ["<action 1>", "<action 2>"],
      "impact": "<expected positive impact>"
    },
    {
      "title": "<short action title>",
      "priority": "<HIGH or MEDIUM>",
      "description": "<1 sentence description>",
      "actions": ["<action 1>"],
      "impact": "<expected positive impact>"
    }
  ]
}

Return ONLY the JSON object. Provide exactly 3 recommendations.`;
};

/**
 * ATTACK_PATTERN - Describe observed attack methodology
 */
export const attackPatternPrompt = (
  context: string,
  findings: any[],
): string => {
  const patterns = findings
    .filter(
      (f) =>
        f.finding_type?.toLowerCase().includes("brute") ||
        f.finding_type?.toLowerCase().includes("scan") ||
        f.finding_type?.toLowerCase().includes("attack"),
    )
    .map((f) => f.finding_type)
    .slice(0, 3)
    .join(", ");

  const hasCritical = findings.some((f) => f.severity === "CRITICAL");
  const baseSeverity = hasCritical
    ? "CRITICAL"
    : findings.some((f) => f.severity === "HIGH")
      ? "HIGH"
      : "MEDIUM";

  return `${context}

Detected patterns: ${patterns || "Coordinated suspicious activity"}

You are a threat intelligence analyst. Generate a JSON ATTACK_PATTERN insight with this exact structure:
{
  "pattern_type": "<name of the attack pattern>",
  "description": "<2 sentence description of the attack methodology>",
  "affected_endpoints": ["<endpoint 1>", "<endpoint 2>"],
  "attack_flow": ["<step 1>", "<step 2>"],
  "severity": "<CRITICAL, HIGH, MEDIUM, or LOW>",
  "confidence_score": 0.7,
  "likely_goals": ["<goal 1>", "<goal 2>"]
}

Return ONLY the JSON object.`;
};

/**
 * ANOMALY_SUMMARY - Explanation of unusual behavior
 */
export const anomalySummaryPrompt = (
  context: string,
  findings: any[],
): string => {
  const uniqueTypes = new Set(findings.map((f) => f.finding_type)).size;
  const hasCritical = findings.some((f) => f.severity === "CRITICAL");
  const baseSeverity = hasCritical
    ? "CRITICAL"
    : findings.some((f) => f.severity === "HIGH")
      ? "HIGH"
      : "MEDIUM";

  return `${context}

Unique attack types detected: ${uniqueTypes}

You are an anomaly detection expert. Generate a JSON ANOMALY_SUMMARY insight with this exact structure:
{
  "anomaly_type": "<type of anomaly detected>",
  "description": "<2 sentence description of the unusual behavior>",
  "confidence_score": 0.75,
  "affected_entities": ["<entity 1>", "<entity 2>", "<entity 3>"],
  "deviation_from_baseline": "<how this deviates from normal behavior>",
  "recommended_action": "<recommended investigative or defensive action>",
  "severity": "${baseSeverity}"
}

Return ONLY the JSON object.`;
};
