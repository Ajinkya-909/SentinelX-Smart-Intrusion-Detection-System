import { BaseDetector, MicroPattern } from "./base.detector";

export class ApacheDetector extends BaseDetector {
  protected readonly logType = "APACHE_LOG";
  // We can safely route Apache access logs to the Nginx parser, 
  // or a shared WebParser in the future.
  protected readonly parserName = "nginxParserV1"; 

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasIpAddress",
      regex: /(?:\d{1,3}\.){3}\d{1,3}/,
      weight: 1
    },
    {
      name: "hasHttpVerb",
      regex: /"(?:GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s/,
      weight: 2
    },
    {
      name: "hasApacheErrorTimestamp",
      // Apache error logs use this specific format: [Wed Oct 11 14:32:52.223423 2026] [core:error]
      regex: /\[[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d{1,2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?\s\d{4}\]/,
      weight: 4
    },
    {
      name: "hasApacheModuleTag",
      // Matches [module:level] or [pid 1234:tid 5678]
      regex: /\[(?:[a-z_0-9]+:[a-z]+|pid\s\d+)\]/,
      weight: 2
    }
  ];
}

export const apacheDetector = new ApacheDetector();