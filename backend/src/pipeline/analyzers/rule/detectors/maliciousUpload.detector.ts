import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { loadAnalyzerConfig } from "../../shared/config/analyzer.config";

/**
 * DETECTOR 10: Dangerous File Upload
 *
 * Triggers when file upload contains dangerous extensions:
 * - .exe, .bat, .cmd, .com
 * - .sh, .bash, .zsh
 * - .jar, .class
 * - .asp, .aspx, .jsp, .php
 * - .dll, .so, .dylib
 * - .scr, .vbs
 */
export const maliciousUploadDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const config = loadAnalyzerConfig();

    if (ctx.logs.length === 0) return findings;

    // Find file upload events (typically POST to /upload endpoints with 200/201 response)
    const uploadLogs = ctx.logs.filter((log) => {
      return (
        log.endpoint?.includes("/upload") ||
        log.endpoint?.includes("/file") ||
        log.http_method === "POST"
      );
    });

    if (uploadLogs.length === 0) return findings;

    for (const log of uploadLogs) {
      // Check metadata or message for dangerous file extensions
      const checkString =
        `${log.message} ${JSON.stringify(log.metadata || "")}`.toLowerCase();

      for (const ext of config.maliciousPayload.dangerousExtensions) {
        if (checkString.includes(ext.toLowerCase())) {
          findings.push(
            createFinding({
              jobId: ctx.jobId,
              analyzer: "rule",
              finding_type: "DANGEROUS_FILE_UPLOAD",
              severity: FindingSeverity.HIGH,
              confidence: 0.95,
              title: "Dangerous File Upload Detected",
              summary: `Attempt to upload executable file with extension ${ext}`,
              log_references: [log.id],
              affected_entities: {
                source_ip: log.ip_address,
                uploaded_by_user: log.metadata?.user_id || "unknown",
                target_endpoint: log.endpoint,
                file_extension: ext,
              },
              evidence: {
                file_extension: ext,
                http_method: log.http_method,
                response_code: log.status_code,
                upload_successful:
                  log.status_code === 200 || log.status_code === 201,
              },
              metadata: {
                rule_id: "rule_6_1",
                rule_version: "1.0",
              },
              recommendation:
                "Block user upload privileges. Quarantine uploaded file. Scan server for malware. Review file system for modifications.",
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

