import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

export const xssDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    for (const log of ctx.logs) {
      // ONLY run this on logs that are actually HTTP Web Requests
      if (!log.event_type.startsWith("HTTP_")) continue;

      // Extract specific fields where XSS usually occurs
      const targetFields = [
        log.message,
        log.metadata?.request?.url,
        log.metadata?.action?.endpoint,
        ...(log.metadata?.request?.query ? Object.values(log.metadata.request.query) : [])
      ].filter(Boolean).map(String);

      const checkString = targetFields.join(" ").toLowerCase();

      for (const pattern of config.maliciousPayload.xssPatterns) {
        if (checkString.includes(pattern.toLowerCase())) {
          
          const statusCode = log.metadata?.request?.statusCode;
          const isSuccessful = statusCode === 200 || statusCode === 201;

          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "rule",
              finding_type: "MALICIOUS_PAYLOAD_XSS",
              severity: isSuccessful ? FindingSeverity.HIGH : FindingSeverity.MEDIUM,
              confidence: 0.95,
              title: "Cross-Site Scripting (XSS) Attempt",
              summary: `XSS pattern detected from ${log.ip_address || 'unknown IP'}`,
              log_references: [log.id],
              affected_entities: {
                source_ip: log.ip_address,
                target_endpoint: log.metadata?.action?.endpoint || "unknown",
              },
              evidence: {
                pattern_matched: pattern,
                payload: checkString.substring(0, 200),
                response_code: statusCode,
                injection_likely_successful: isSuccessful,
              },
              metadata: { rule_id: "rule_xss_1" },
              recommendation: "Ensure application sanitizes user input and implements strict Content Security Policy (CSP).",
            })
          );
          break; // Report once per log
        }
      }
    }
    return findings;
  },
};