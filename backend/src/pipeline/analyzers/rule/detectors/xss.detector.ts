import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 7: XSS (Cross-Site Scripting) Attempt
 *
 * Triggers when request contains XSS patterns:
 * - <script>
 * - javascript:
 * - onerror=
 * - onload=
 * - eval(
 * - onclick=
 * - onmouseover=
 */
export const xssDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    for (const log of ctx.logs) {
      // Check request parameters and message for XSS patterns
      const checkString =
        `${log.message} ${JSON.stringify(log.metadata || {})}`.toLowerCase();

      for (const pattern of config.maliciousPayload.xssPatterns) {
        if (checkString.includes(pattern.toLowerCase())) {
          const storedInDb = log.status_code === 200 || log.status_code === 201;

          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "rule",
              finding_type: "MALICIOUS_PAYLOAD_XSS",
              severity: FindingSeverity.HIGH,
              confidence: 0.9,
              title: "XSS Attack Pattern Detected",
              summary: "Request contains XSS payload",
              log_references: [log.id],
              affected_entities: {
                source_ip: log.ip_address,
                target_endpoint: log.endpoint,
                parameter: "request_param",
              },
              evidence: {
                pattern_matched: pattern,
                payload_location: "request_body",
                stored_in_db: storedInDb,
                response_code: log.status_code,
              },
              metadata: {
                rule_id: "rule_4_2",
                rule_version: "1.0",
              },
              recommendation:
                "Sanitize user input. Review database for malicious entries. Implement Content Security Policy.",
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
