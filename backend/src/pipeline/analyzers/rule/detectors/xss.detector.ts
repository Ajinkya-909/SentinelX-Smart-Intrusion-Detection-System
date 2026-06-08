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

    const findingsMap = new Map<string, any>();

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

          const ip = log.ip_address || "unknown";
          const key = `${ip}_${pattern}`;

          if (!findingsMap.has(key)) {
            findingsMap.set(key, {
              ip,
              pattern,
              endpoint: log.metadata?.action?.endpoint || "unknown",
              statusCode,
              isSuccessful,
              payload: checkString.substring(0, 200),
              logs: []
            });
          }

          const entry = findingsMap.get(key);
          entry.logs.push(log);
          if (isSuccessful) entry.isSuccessful = true;

          break; // Report once per log
        }
      }
    }

    for (const [key, entry] of findingsMap) {
      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "rule",
          finding_type: "MALICIOUS_PAYLOAD_XSS",
          severity: entry.isSuccessful ? FindingSeverity.HIGH : FindingSeverity.MEDIUM,
          confidence: 0.95,
          title: "Cross-Site Scripting (XSS) Attempt",
          summary: `XSS pattern '${entry.pattern}' detected from ${entry.ip} (${entry.logs.length} occurrences)`,
          log_references: entry.logs.slice(0, 50).map((l: any) => l.id),
          affected_entities: {
            source_ip: entry.ip,
            target_endpoint: entry.endpoint,
          },
          evidence: {
            pattern_matched: entry.pattern,
            payload: entry.payload,
            occurrences: entry.logs.length,
            response_code: entry.statusCode,
            injection_likely_successful: entry.isSuccessful,
          },
          metadata: { rule_id: "rule_xss_1" },
          recommendation: "Ensure application sanitizes user input and implements strict Content Security Policy (CSP).",
        })
      );
    }

    return findings;
  },
};