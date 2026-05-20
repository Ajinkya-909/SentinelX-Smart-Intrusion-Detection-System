import fs from "fs";
import logger from "../../config/logger";
import { typeDetectorService } from "../type-detector/type-detector.service";
import { nginxParser } from "./strategies/nginx.parser";
import { syslogParser } from "./strategies/syslog.parser";
import { jsonParser } from "./strategies/json.parser";
import { genericParser } from "./strategies/generic.parser";
import { BaseParser } from "./strategies/base.parser";
import { ParsedLog } from "./types";

/**
 * Parser Service
 * Routes log parsing to type-specific parser implementations
 * Coordinates between type detection result and parsing execution
 */
class ParserService {
  /**
   * Main parse orchestration method
   * @param jobId - Job identifier
   * @param filePath - Path to log file to parse
   * @returns - Array of parsed log entries
   */
  async parse(jobId: string, filePath: string): Promise<ParsedLog[]> {
    logger.info(
      `[PARSER_SERVICE] Starting parse orchestration for job ${jobId}`,
    );

    try {
      // ================================================
      // STEP 1: Fetch detection metadata from database
      // ================================================
      logger.info(
        `[PARSER_SERVICE] Fetching detection metadata for job ${jobId}`,
      );
      const detectionMetadata =
        await typeDetectorService.getDetectionMetadata(jobId);

      if (!detectionMetadata) {
        throw new Error(
          `[PARSER_SERVICE] No detection metadata found for job ${jobId}. Type detection must complete before parsing.`,
        );
      }

      logger.info(
        `[PARSER_SERVICE] Detection metadata retrieved: Type=${detectionMetadata.detectedType}, Parser=${detectionMetadata.parser}`,
      );

      // ================================================
      // STEP 2: Read file into lines
      // ================================================
      logger.info(`[PARSER_SERVICE] Reading file: ${filePath}`);
      const rawLines = await this.readFileLines(filePath);
      logger.info(`[PARSER_SERVICE] Read ${rawLines.length} lines from file`);

      // ================================================
      // STEP 3: Select appropriate parser based on detected type
      // ================================================
      const parser = this.selectParser(detectionMetadata.detectedType);
      logger.info(
        `[PARSER_SERVICE] Selected parser: ${parser.constructor.name} for type ${detectionMetadata.detectedType}`,
      );

      // ================================================
      // STEP 4: Parse all lines
      // ================================================
      logger.info(`[PARSER_SERVICE] Parsing ${rawLines.length} lines...`);
      const result = await parser.parse(rawLines);

      logger.info(
        `[PARSER_SERVICE] Parse complete: ${result.stats.successfullyParsed}/${result.stats.totalLines} successful`,
      );

      // Log any parsing failures
      if (result.failedLines.length > 0) {
        logger.warn(
          `[PARSER_SERVICE] ${result.failedLines.length} lines failed to parse`,
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
        `[PARSER_SERVICE] Parse failed for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Read file and return array of lines
   * @param filePath - Path to file
   * @returns - Array of trimmed lines
   */
  private async readFileLines(filePath: string): Promise<string[]> {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      return lines;
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
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
