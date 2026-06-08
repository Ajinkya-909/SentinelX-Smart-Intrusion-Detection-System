import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";

export const maliciousUploadDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    
    // Highly dangerous executable extensions in a web context
    const dangerousExtensions = [".php", ".php5", ".phtml", ".jsp", ".exe", ".sh", ".py", ".pl", ".cgi"];

    const findingsMap = new Map<string, any>();

    for (const log of ctx.logs) {
      // We only care about events uploading data
      if (log.event_type !== "HTTP_POST" && log.event_type !== "HTTP_PUT" && log.event_type !== "DATA_UPLOAD") {
        continue;
      }

      const url = (log.metadata?.request?.url || log.metadata?.action?.endpoint || "").toLowerCase();
      
      // Check if URL ends with a dangerous extension or contains it in a query
      for (const ext of dangerousExtensions) {
        if (url.includes(ext)) {
          
          const statusCode = log.metadata?.request?.statusCode;
          const isSuccessful = statusCode === 200 || statusCode === 201;

          const ip = log.ip_address || "unknown";
          const key = `${ip}_${ext}`;

          if (!findingsMap.has(key)) {
            findingsMap.set(key, {
              ip,
              ext,
              url,
              statusCode,
              isSuccessful,
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
          finding_type: "DANGEROUS_FILE_UPLOAD",
          severity: entry.isSuccessful ? FindingSeverity.CRITICAL : FindingSeverity.HIGH,
          confidence: 0.90,
          title: "Suspicious File Upload Attempt",
          summary: `Attempt to upload potentially executable file (${entry.ext}) by ${entry.ip} (${entry.logs.length} occurrences)`,
          log_references: entry.logs.slice(0, 50).map((l: any) => l.id),
          affected_entities: {
            source_ip: entry.ip,
            target_endpoint: entry.url,
          },
          evidence: {
            extension: entry.ext,
            full_url: entry.url,
            occurrences: entry.logs.length,
            response_code: entry.statusCode,
            upload_successful: entry.isSuccessful
          },
          metadata: { rule_id: "rule_upload_1" },
          recommendation: "CRITICAL: Ensure upload directories do not have execution permissions. Inspect uploaded files immediately.",
        })
      );
    }

    return findings;
  },
};