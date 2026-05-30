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

          findings.push(
              createFinding({
                jobId: ctx.jobId,
                analyzer: "rule",
                finding_type: "DANGEROUS_FILE_UPLOAD",
                severity: isSuccessful ? FindingSeverity.CRITICAL : FindingSeverity.HIGH,
              confidence: 0.90,
              title: "Suspicious File Upload Attempt",
              summary: `Attempt to upload potentially executable file (${ext}) by ${log.ip_address}`,
              log_references: [log.id],
              affected_entities: {
                source_ip: log.ip_address,
                target_endpoint: url,
              },
              evidence: {
                extension: ext,
                full_url: url,
                response_code: statusCode,
                upload_successful: isSuccessful
              },
              metadata: { rule_id: "rule_upload_1" },
              recommendation: "CRITICAL: Ensure upload directories do not have execution permissions. Inspect uploaded files immediately.",
            })
          );
          break;
        }
      }
    }
    return findings;
  },
};