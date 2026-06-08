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

    const findingsMap = new Map<string, any>();

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

          break;
        }
      }
    }

    for (const [key, entry] of findingsMap) {
      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "rule",
          finding_type: "MALICIOUS_PAYLOAD_PATH_TRAVERSAL",
          severity: entry.isSuccessful ? FindingSeverity.CRITICAL : FindingSeverity.HIGH,
          confidence: 0.95,
          title: "Directory Traversal Attempt",
          summary: `Path traversal pattern '${entry.pattern}' detected from ${entry.ip} (${entry.logs.length} occurrences)`,
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
            read_likely_successful: entry.isSuccessful,
          },
          metadata: { rule_id: "rule_pt_1" },
          recommendation: "CRITICAL: If HTTP 200, an attacker may have read arbitrary files on the server. Block IP immediately.",
        })
      );
    }

    return findings;
  },
};