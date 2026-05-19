import logger from "../../../config/logger";
import { DetectorResult } from "./nginx.detector";

// ================================================
// SYSLOG DETECTOR
// ================================================

export class SyslogDetector {
  private readonly name = "SYSLOG";

  // Syslog-specific regex patterns
  private patterns = {
    // Standard syslog format: Jan 15 10:30:45 hostname service[pid]: message
    syslogFormat:
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+\S+(\[\d+\])?:\s+/,

    // RFC3164 timestamp: Jan 15 10:30:45
    timestamp:
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/,

    // Hostname pattern: word characters and hyphens
    hostname: /\s+[\w\-\.]+\s+/,

    // Process name with optional PID: sshd[1234] or kernel
    process: /\s+\w+(\[\d+\])?:\s+/,

    // ISO8601 timestamp variant: 2024-01-15T10:30:45Z
    iso8601: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[\+\-]\d{2}:\d{2})/,
  };

  /**
   * Analyze lines for Syslog format
   * @param lines - Sample of log lines
   * @returns - DetectorResult with confidence score
   */
  analyze(lines: string[]): DetectorResult {
    logger.debug(`[SYSLOG_DETECTOR] Analyzing ${lines.length} lines`);

    let syslogFormatMatches = 0;
    let timestampMatches = 0;
    let hostnameMatches = 0;
    let processMatches = 0;
    let iso8601Matches = 0;

    for (const line of lines) {
      if (this.patterns.syslogFormat.test(line)) {
        syslogFormatMatches++;
      }
      if (this.patterns.timestamp.test(line)) {
        timestampMatches++;
      }
      if (this.patterns.hostname.test(line)) {
        hostnameMatches++;
      }
      if (this.patterns.process.test(line)) {
        processMatches++;
      }
      if (this.patterns.iso8601.test(line)) {
        iso8601Matches++;
      }
    }

    // Calculate confidence: average of pattern matches
    const syslogFormatConfidence = syslogFormatMatches / lines.length;
    const timestampConfidence = timestampMatches / lines.length;
    const hostnameConfidence = hostnameMatches / lines.length;
    const processConfidence = processMatches / lines.length;
    const iso8601Confidence = iso8601Matches / lines.length;

    const confidence =
      (syslogFormatConfidence +
        timestampConfidence +
        hostnameConfidence +
        processConfidence +
        iso8601Confidence) /
      5;

    logger.debug(
      `[SYSLOG_DETECTOR] Confidence: ${(confidence * 100).toFixed(2)}% (syslogFormat: ${(syslogFormatConfidence * 100).toFixed(2)}%, timestamp: ${(timestampConfidence * 100).toFixed(2)}%, hostname: ${(hostnameConfidence * 100).toFixed(2)}%, process: ${(processConfidence * 100).toFixed(2)}%, iso8601: ${(iso8601Confidence * 100).toFixed(2)}%)`,
    );

    return {
      type: "SYSLOG",
      parser: "syslogParserV1",
      confidence,
      matched: [
        syslogFormatMatches > 0 ? "syslogFormat" : null,
        timestampMatches > 0 ? "timestamp" : null,
        hostnameMatches > 0 ? "hostname" : null,
        processMatches > 0 ? "process" : null,
        iso8601Matches > 0 ? "iso8601" : null,
      ].filter((m) => m !== null) as string[],
    };
  }
}

export const syslogDetector = new SyslogDetector();
