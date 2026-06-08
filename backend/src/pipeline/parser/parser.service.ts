import logger from "../../config/logger";
import { nginxParser } from "./strategies/nginx.parser";
import { apacheParser } from "./strategies/apache.parser";
import { syslogParser } from "./strategies/syslog.parser";
import { jsonParser } from "./strategies/json.parser";
import { keyValueParser } from "./strategies/keyvalue.parser";
import { genericParser } from "./strategies/generic.parser";
import { BaseParser } from "./strategies/base.parser";
import { BatchParseResult } from "./types";

class ParserService {
  /**
   * Parse a single batch of preprocessed log lines
   * Reports back success rate for the Orchestrator's Adaptive Parsing Loop
   */
  async parseBatch(
    rawLines: string[],
    detectedType: string,
  ): Promise<BatchParseResult> {
    logger.info(`[PARSER_SERVICE] Parsing batch of ${rawLines.length} lines using strategy: ${detectedType}`);

    try {
      const parser = this.selectParser(detectedType, rawLines);
      
      const result = await parser.parse(rawLines);
      
      // Calculate strict success rate
      const successRate = result.stats.totalLines > 0 
        ? result.stats.successfullyParsed / result.stats.totalLines 
        : 0;

      logger.info(
        `[PARSER_SERVICE] Batch complete: ${result.stats.successfullyParsed}/${result.stats.totalLines} (${(successRate * 100).toFixed(1)}%) successful`
      );

      return {
        parsedLogs: result.parsedLogs,
        failedLines: result.failedLines.map(f => f.rawLine),
        successRate,
        detectedTypeUsed: detectedType
      };

    } catch (error) {
      logger.error(`[PARSER_SERVICE] Parse failed for batch: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private selectParser(detectedType: string, rawLines: string[] = []): BaseParser {
    switch (detectedType) {
      case "NGINX_ACCESS":
      case "NGINX_ERROR":
        return nginxParser;
      case "APACHE_ACCESS":
      case "APACHE_ERROR":
        return apacheParser;
      case "SYSLOG": 
        return syslogParser;
      case "WINDOWS_EVENT":
      case "JSON":
      case "AWS_CLOUDTRAIL":
      case "SURICATA_EVE":
      case "DOCKER_JSON":
        return jsonParser; // Our upgraded JSON parser handles all these envelopes
      case "KEY_VALUE":
        return keyValueParser;
      case "FIREWALL_LOG": {
        // If the logs are JSON-formatted, route to the jsonParser. Otherwise route to the keyValueParser.
        const firstLine = rawLines.find(line => line && line.trim().length > 0);
        if (firstLine && firstLine.trim().startsWith("{")) {
          return jsonParser;
        }
        return keyValueParser;
      }
      case "GENERIC":
      default: 
        return genericParser;
    }
  }
}

export const parserService = new ParserService();