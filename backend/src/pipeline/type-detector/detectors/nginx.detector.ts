import { BaseDetector, MicroPattern } from "./base.detector";

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
      name: "hasIPv4OrIPv6",
      regex: /(?:\d{1,3}\.){3}\d{1,3}|(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}/,
      weight: 1
    },
    {
      name: "hasHttpVerb",
      regex: /"(?:GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s/,
      weight: 2,
      isCritical: true // Without an HTTP verb, it's very unlikely to be an access log
    },
    {
      name: "hasStatusCode",
      regex: /\s[2345]\d{2}\s/,
      weight: 1
    },
    {
      name: "hasNginxTimestamp",
      // Matches standard Nginx: [15/May/2026:10:30:45 +0000]
      regex: /\[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4}\]/,
      weight: 3 
    },
    {
      name: "hasNginxErrorFormat",
      // Nginx error logs look different: 2026/05/15 10:30:45 [error] 12345#0:
      regex: /^\d{4}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2}\s\[(?:error|warn|crit|info|debug)\]/,
      weight: 4
    }
  ];
}

export const nginxDetector = new NginxDetector();