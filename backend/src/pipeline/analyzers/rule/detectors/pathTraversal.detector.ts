import { IDetector } from "../../shared/interfaces/Detector.interface.js";
import { AnalyzerFinding } from "../../shared/findings/Finding.types.js";
import { AnalysisContext } from "../../shared/context/AnalysisContext.js";
import { FindingSeverity } from "../../shared/findings/FindingSeverity.js";
import { createFinding } from "../../shared/findings/createFinding.js";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config.js";

/**
 * DETECTOR 8: Path Traversal Attempt
 *
 * Triggers when request contains path traversal patterns:
 * - ../
 * - ..\\
 * - %2e%2e/
 * - %2e%2e%5c
 */
export const pathTraversalDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    for (const log of ctx.logs) {
      // Check request path for traversal patterns
      const checkString = `${log.endpoint || ""} ${log.message}`.toLowerCase();

      for (const pattern of config.maliciousPayload.pathTraversalPatterns) {
        if (checkString.includes(pattern.toLowerCase())) {
          const accessSuccessful =
            log.status_code === 200 || log.status_code === 206;

          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "rule",
              finding_type: "MALICIOUS_PAYLOAD_PATH_TRAVERSAL",
              severity: FindingSeverity.HIGH,
              confidence: 0.92,
              title: "Path Traversal Attack Detected",
              summary: "Attempt to access files outside intended directory",
              log_references: [log.id],
              affected_entities: {
                source_ip: log.ip_address,
                target_endpoint: log.endpoint,
              },
              evidence: {
                request_path: log.endpoint,
                pattern_matched: pattern,
                response_code: log.status_code,
                file_access_successful: accessSuccessful,
              },
              metadata: {
                rule_id: "rule_4_3",
                rule_version: "1.0",
              },
              recommendation:
                "Block IP immediately. Review file access logs for data exfiltration. Verify system file integrity.",
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
