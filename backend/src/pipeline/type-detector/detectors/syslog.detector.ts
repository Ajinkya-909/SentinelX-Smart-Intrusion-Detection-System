import { BaseDetector, MicroPattern } from "./base.detector";

export class SyslogDetector extends BaseDetector {
  protected readonly logType = "SYSLOG";
  protected readonly parserName = "syslogParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasTraditionalTimestamp",
      // Matches standard Syslog: "Jan 15 10:30:45"
      regex: /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/i,
      weight: 3
    },
    {
      name: "hasIsoTimestamp",
      // Modern RFC 5424 uses ISO8601
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/,
      weight: 3
    },
    {
      name: "hasProcessAndPid",
      // Matches the classic "process_name[12345]:"
      regex: /[a-zA-Z0-9_-]+\[\d+\]:/,
      weight: 2
    },
    {
      name: "hasCommonSyslogDaemons",
      // High signal words common in linux auth and system logs
      regex: /\b(?:sshd|kernel|CRON|systemd|sudo|su|auth|pam_unix)\b/i,
      weight: 2
    }
  ];
}

export const syslogDetector = new SyslogDetector();