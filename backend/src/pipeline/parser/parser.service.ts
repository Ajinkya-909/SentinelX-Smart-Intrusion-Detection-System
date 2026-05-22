import logger from "../../config/logger";
import { nginxParser } from "./strategies/nginx.parser";
import { syslogParser } from "./strategies/syslog.parser";
import { jsonParser } from "./strategies/json.parser";
import { keyValueParser } from "./strategies/keyvalue.parser";
import { genericParser } from "./strategies/generic.parser";
import { BaseParser } from "./strategies/base.parser";
import { ParsedLog } from "./types";

/**
 * Parser Service
 * Routes log parsing to type-specific parser implementations
 * Processes a single batch of preprocessed lines at a time
 *
 * IMPORTANT: This service does NOT read files. It only parses preprocessed batches.
 * File reading is done by preprocessing service in streaming batches.
 */
class ParserService {
  /**
   * Parse a single batch of preprocessed log lines
   * Called from orchestrator for each batch after preprocessing
   *
   * @param rawLines - Array of preprocessed raw log lines (from one batch)
   * @param detectedType - Log type detected by type detection (e.g., "NGINX_ACCESS", "SYSLOG")
   * @returns - Array of parsed log entries (in-memory, not persisted)
   */
  async parseBatch(
    rawLines: string[],
    detectedType: string,
  ): Promise<ParsedLog[]> {
    logger.info(
      `[PARSER_SERVICE] Parsing batch of ${rawLines.length} lines for type: ${detectedType}`,
    );

    try {
      // ================================================
      // Select appropriate parser based on detected type
      // ================================================
      const parser = this.selectParser(detectedType);
      logger.debug(
        `[PARSER_SERVICE] Selected parser: ${parser.constructor.name}`,
      );

      // ================================================
      // Parse the batch
      // ================================================
      const result = await parser.parse(rawLines);

      logger.info(
        `[PARSER_SERVICE] Batch parse complete: ${result.stats.successfullyParsed}/${result.stats.totalLines} successful`,
      );

      // Log parsing failures if any
      if (result.failedLines.length > 0) {
        logger.warn(
          `[PARSER_SERVICE] ${result.failedLines.length} lines failed to parse in this batch`,
        );

        // Log first few failures for debugging
        result.failedLines.slice(0, 3).forEach((error) => {
          logger.debug(
            `[PARSER_SERVICE] Failed line ${error.lineNumber}: ${error.error}`,
          );
        });
      }

      return result.parsedLogs;
    } catch (error) {
      logger.error(
        `[PARSER_SERVICE] Parse failed for batch: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Select parser based on detected log type
   * @param detectedType - Log type from type detection (e.g., "NGINX_ACCESS", "SYSLOG")
   * @returns - Appropriate parser instance
   */
  private selectParser(detectedType: string): BaseParser {
    logger.debug(`[PARSER_SERVICE] Selecting parser for type: ${detectedType}`);

    switch (detectedType) {
      case "NGINX_ACCESS":
        return nginxParser;

      case "SYSLOG":
        return syslogParser;

      case "JSON":
        return jsonParser;

      case "KEY_VALUE":
        logger.info(
          `[PARSER_SERVICE] Using key-value parser for type: ${detectedType}`,
        );
        return keyValueParser;

      case "GENERIC":
      default:
        logger.info(
          `[PARSER_SERVICE] Using generic parser for type: ${detectedType}`,
        );
        return genericParser;
    }
  }
}

export const parserService = new ParserService();
