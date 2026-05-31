import { BaseDetector, MicroPattern } from "./base.detector";

export class ApacheDetector extends BaseDetector {
  protected readonly logType = "APACHE_LOG";
  protected readonly parserName = "nginxParserV1"; // Shared web parser

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasStrictErrorFormat",
      // Strictly anchored Apache error: [Wed Oct 11 14:32:52.223423 2026] [core:error] [pid 1234]
      regex: /^\[[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\s+\d{4}\]\s+\[.*?:.*?\]\s+\[pid\s+\d+(?::tid\s+\d+)?\]/,
      weight: 5,
      isCritical: true
    },
    {
      name: "hasStrictAccessFormat",
      // Apache access format is highly identical to Nginx combined format
      regex: /^[\da-fA-F\.:]+\s+-\s+(?:-|[\w.-]+)\s+\[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\]/,
      weight: 3
    }
  ];
}

export const apacheDetector = new ApacheDetector();