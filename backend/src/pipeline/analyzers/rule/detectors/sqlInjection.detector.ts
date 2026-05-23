import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 6: SQL Injection Attempt
 *
 * Triggers when request contains SQL injection patterns:
 * - OR '1'='1
 * - UNION SELECT
 * - DROP TABLE
 * - INSERT INTO
 * - DELETE FROM
 * - EXEC(
 * - ;--
 * - '/*
 */
export const sqlInjectionDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    for (const log of ctx.logs) {
      // Check request parameters and message for SQL patterns
      const checkString =
        `${log.message} ${JSON.stringify(log.metadata || {})}`.toLowerCase();

      for (const pattern of config.maliciousPayload.sqlInjectionPatterns) {
        if (checkString.includes(pattern.toLowerCase())) {
          const isSuccessful = log.status_code === 200;

          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "rule",
              finding_type: "MALICIOUS_PAYLOAD_SQL_INJECTION",
              severity: isSuccessful
                ? FindingSeverity.CRITICAL
                : FindingSeverity.HIGH,
              confidence: isSuccessful ? 0.98 : 0.95,
              title: "SQL Injection Attempt Detected",
              summary: "Request contains SQL injection pattern",
              log_references: [log.id],
              affected_entities: {
                source_ip: log.ip_address,
                target_endpoint: log.endpoint,
                parameter: "request_param",
              },
              evidence: {
                pattern_matched: pattern,
                payload: checkString.substring(0, 100),
                response_code: log.status_code,
                injection_likely_successful: isSuccessful,
              },
              metadata: {
                rule_id: "rule_4_1",
                rule_version: "1.0",
              },
              recommendation:
                "CRITICAL: Block IP immediately. Rotate database credentials. Review database logs for data access.",
            }),
          );

          // Only report once per log
          break;
        }
      }
    }

    return findings;
  },
};
