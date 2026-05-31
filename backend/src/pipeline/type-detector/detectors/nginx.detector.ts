import { BaseDetector, MicroPattern } from "./base.detector";

// Re-added the missing interface required by index.ts
export interface DetectorResult {
  type: string;
  confidence: number;
  parser: string;
  matched: string[];
  analysis?: any;
}

export class NginxDetector extends BaseDetector {
  protected readonly logType = "NGINX_ACCESS";
  protected readonly parserName = "nginxParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasStrictAccessFormat",
      // Strictly anchored to start of line: IP - - [Date] "Method
      regex: /^[\da-fA-F\.:]+\s+-\s+(?:-|[\w.-]+)\s+\[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\]\s+"(?:GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)/,
      weight: 5,
      isCritical: true
    },
    {
      name: "hasStrictErrorFormat",
      // Strictly anchored Nginx error log: 2026/05/15 10:30:45 [error] 12345#0:
      regex: /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+\[(?:error|warn|crit|info|debug)\]\s+\d+#\d+:/,
      weight: 5
    }
  ];
}

export const nginxDetector = new NginxDetector();