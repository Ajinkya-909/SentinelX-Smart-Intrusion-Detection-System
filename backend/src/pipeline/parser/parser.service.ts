import logger from "../../config/logger";
import { nginxParser } from "./strategies/nginx.parser";
import { syslogParser } from "./strategies/syslog.parser";
import { jsonParser } from "./strategies/json.parser";
import { keyValueParser } from "./strategies/keyvalue.parser";
import { genericParser } from "./strategies/generic.parser";
import { BaseParser } from "./strategies/base.parser";
import { ParsedLog } from "./types";

export interface BatchParseResult {
  parsedLogs: ParsedLog[];
  failedLines: string[];
  successRate: number; // e.g., 0.95 for 95%
  detectedTypeUsed: string;
}

class ParserService {
  /**
   * Parse a single batch of preprocessed log lines
   * Reports back success rate for Adaptive Parsing
   */
  async parseBatch(
    rawLines: string[],
    detectedType: string,
  ): Promise<BatchParseResult> {
    logger.info(`[PARSER_SERVICE] Parsing batch of ${rawLines.length} lines using strategy: ${detectedType}`);

    try {
      const parser = this.selectParser(detectedType);
      
      // Parse the batch (BaseParser returns detailed stats)
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
        failedLines: result.failedLines.map(f => f.rawLine), // Extract just the raw strings for potential re-parsing
        successRate,
        detectedTypeUsed: detectedType
      };

    } catch (error) {
      logger.error(`[PARSER_SERVICE] Parse failed for batch: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private selectParser(detectedType: string): BaseParser {
    switch (detectedType) {
      case "NGINX_ACCESS": return nginxParser;
      case "SYSLOG": return syslogParser;
      case "JSON": return jsonParser;
      case "KEY_VALUE": return keyValueParser;
      case "GENERIC":
      default: return genericParser;
    }
  }
}

export const parserService = new ParserService();