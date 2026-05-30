import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const pathTraversalDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    for (const log of ctx.logs) {
      if (!log.event_type.startsWith("HTTP_")) continue;

      // Path traversal happens explicitly in URLs or File Paths
      const targetFields = [
        log.metadata?.request?.url,
        log.metadata?.action?.endpoint,
        ...(log.metadata?.request?.query ? Object.values(log.metadata.request.query) : [])
      ].filter(Boolean).map(String);

      const checkString = targetFields.join(" ").toLowerCase();

      for (const pattern of config.maliciousPayload.pathTraversalPatterns) {
        if (checkString.includes(pattern.toLowerCase())) {
          
          const statusCode = log.metadata?.request?.statusCode;
          const isSuccessful = statusCode === 200;

          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "rule",
              finding_type: "MALICIOUS_PAYLOAD_PATH_TRAVERSAL",
              severity: isSuccessful ? FindingSeverity.CRITICAL : FindingSeverity.HIGH,
              confidence: 0.95,
              title: "Directory Traversal Attempt",
              summary: `Path traversal attempt detected from ${log.ip_address || 'unknown IP'}`,
              log_references: [log.id],
              affected_entities: {
                source_ip: log.ip_address,
                target_endpoint: log.metadata?.action?.endpoint || "unknown",
              },
              evidence: {
                pattern_matched: pattern,
                payload: checkString.substring(0, 200),
                response_code: statusCode,
                read_likely_successful: isSuccessful,
              },
              metadata: { rule_id: "rule_pt_1" },
              recommendation: "CRITICAL: If HTTP 200, an attacker may have read arbitrary files on the server. Block IP immediately.",
            })
          );
          break;
        }
      }
    }
    return findings;
  },
};