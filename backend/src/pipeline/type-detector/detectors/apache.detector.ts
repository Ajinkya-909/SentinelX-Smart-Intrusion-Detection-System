import { BaseDetector, MicroPattern } from "./base.detector";

export class ApacheAccessDetector extends BaseDetector {
  protected readonly logType = "APACHE_ACCESS";
  protected readonly parserName = "apacheParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasStrictAccessFormat",
      // Matches standard and Virtual Host (VHost) tagged Apache Access logs
      regex: /^(?:[\w.-]+:\d+\s+)?[\da-fA-F\.:]+\s+-\s+(?:-|[\w.-]+)\s+\[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\]/,
      weight: 5,
      isCritical: true
    },
    {
      name: "hasHttpVerbAndStatus",
      regex: /"(?:GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+\S+\s+HTTP\/\d\.\d"\s+\d{3}\s+(?:\d+|-)/,
      weight: 3
    }
  ];
}

export class ApacheErrorDetector extends BaseDetector {
  protected readonly logType = "APACHE_ERROR";
  protected readonly parserName = "apacheParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasStrictErrorFormat",
      // Matches standard Apache pre-2.4 and post-2.4 core/module error formats:
      // [Wed Oct 11 14:32:52.223423 2026] [module:level]
      // [Sun Jun 01 02:18:14 2026] [error]
      regex: /^\[[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\s+\d{4}\]\s+\[(?:[a-z0-9_-]+:)?(?:emerg|alert|crit|error|warn|notice|info|debug)\]/i,
      weight: 5,
      isCritical: true
    },
    {
      name: "hasApacheErrorPidOrClient",
      // Matches pid or client IP patterns often found in Apache error logs
      regex: /\[(?:pid\s+\d+|client\s+[\da-fA-F\.:]+)/i,
      weight: 3
    }
  ];
}

export const apacheAccessDetector = new ApacheAccessDetector();
export const apacheErrorDetector = new ApacheErrorDetector();