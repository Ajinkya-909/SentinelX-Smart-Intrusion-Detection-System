import { BaseDetector, MicroPattern } from "./base.detector";

export class SyslogDetector extends BaseDetector {
  protected readonly logType = "SYSLOG";
  protected readonly parserName = "syslogParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasStrictTraditionalHeader",
      // FIX: Added () and / to the process name character class to support "sshd(pam_unix)"
      regex: /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(?:[\w.-]+\s+)?[a-zA-Z0-9_.()/-]+(?:\[\d+\])?:\s/i,
      weight: 5,
      isCritical: true
    },
    {
      name: "hasStrictRFC5424Header",
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\s+[\w.-]+\s+[\w.-]+/i,
      weight: 5
    },
    {
      name: "hasDaemonProcess",
      // FIX: Added ftpd, logrotate and removed the strict trailing colon to allow complex names
      regex: /\b(?:sshd|kernel|CRON|systemd|sudo|su|auth|pam_unix|NetworkManager|ftpd|logrotate|syslogd)\b/i,
      weight: 3
    },
    {
      name: "hasLinuxAuthSignature",
      // FIX: Added specific operational verbs found in your Linux_2k.log
      regex: /(?:Failed password|Accepted (?:password|publickey)|session (?:opened|closed)|Invalid user|authentication failure|check pass|user unknown)\b/i,
      weight: 2
    }
  ];
}

export const syslogDetector = new SyslogDetector();