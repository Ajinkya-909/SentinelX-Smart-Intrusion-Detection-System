import fs from "fs";
import readline from "readline";
import logger from "../../config/logger";
import { promises as fsPromises } from "fs";

// ================================================
// TYPE DEFINITIONS
// ================================================

export interface PreprocessingMetadata {
  batchNumber: number;
  encoding: string;
  lineCount: number;
  estimatedSizeBytes: number;
  linesRemovedAsCorrupt: number;
  emptyLinesRemoved: number;
  whitespaceLinesRemoved: number;
}

export interface PreprocessedBatch {
  batchNumber: number;
  rawLines: string[];
  metadata: PreprocessingMetadata;
  totalProcessedSoFar: number;
}

export interface PreprocessingConfig {
  batchSize?: number;
  maxLineLengthBytes?: number;
  encodingDetectionSampleSize?: number;
}

// ================================================
// PREPROCESSOR SERVICE
// ================================================

export class PreprocessorService {
  private createFileStream(filePath: string): fs.ReadStream {
    logger.info(`[PREPROCESS] Opening file stream: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return fs.createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: 64 * 1024,
    });
  }

  private async detectEncoding(filePath: string): Promise<string> {
    const fileBuffer = await fsPromises.readFile(filePath);

    // Check for BOM (Byte Order Mark)
    if (
      fileBuffer[0] === 0xef &&
      fileBuffer[1] === 0xbb &&
      fileBuffer[2] === 0xbf
    ) {
      return "utf8";
    }

    if (
      (fileBuffer[0] === 0xff && fileBuffer[1] === 0xfe) ||
      (fileBuffer[0] === 0xfe && fileBuffer[1] === 0xff)
    ) {
      return "utf16le";
    }

    return "utf8";
  }

  private createLineReader(stream: fs.ReadStream): readline.Interface {
    return readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });
  }

  private isLineValid(
    line: string,
    maxLineLength: number = 100 * 1024,
  ): boolean {
    if (Buffer.byteLength(line, "utf8") > maxLineLength) {
      return false;
    }

    if (/(.)\1{100,}/.test(line)) {
      return false;
    }

    try {
      Buffer.from(line, "utf8").toString("utf8");
      return true;
    } catch {
      return false;
    }
  }

  private cleanLine(line: string): string {
    return line.trim();
  }

  async *preprocessLines(
    filePath: string,
    config: PreprocessingConfig = {},
  ): AsyncGenerator<PreprocessedBatch> {
    const batchSize = config.batchSize || 1000;
    const maxLineLength = config.maxLineLengthBytes || 100 * 1024;

    const encoding = await this.detectEncoding(filePath);
    const fileStream = this.createFileStream(filePath);
    const lineReader = this.createLineReader(fileStream);

    let batchNumber = 0;
    let currentBatch: string[] = [];
    let totalProcessed = 0;
    let corruptCount = 0;
    let emptyCount = 0;
    let whitespaceCount = 0;

    for await (const rawLine of lineReader) {
      if (rawLine === "") {
        emptyCount++;
        continue;
      }

      if (!this.isLineValid(rawLine, maxLineLength)) {
        corruptCount++;
        logger.warn(
          `[PREPROCESS] Corrupt line at position ${totalProcessed + currentBatch.length + 1}`,
        );
        continue;
      }

      const cleanedLine = this.cleanLine(rawLine);

      if (cleanedLine === "") {
        whitespaceCount++;
        continue;
      }

      currentBatch.push(cleanedLine);

      if (currentBatch.length >= batchSize) {
        batchNumber++;
        totalProcessed += currentBatch.length;

        const estimatedSize = currentBatch.reduce(
          (sum, line) => sum + Buffer.byteLength(line, "utf8"),
          0,
        );

        const batch: PreprocessedBatch = {
          batchNumber,
          rawLines: currentBatch,
          metadata: {
            batchNumber,
            encoding,
            lineCount: currentBatch.length,
            estimatedSizeBytes: estimatedSize,
            linesRemovedAsCorrupt: corruptCount,
            emptyLinesRemoved: emptyCount,
            whitespaceLinesRemoved: whitespaceCount,
          },
          totalProcessedSoFar: totalProcessed,
        };

        logger.info(
          `[PREPROCESS] Batch #${batchNumber}: ${currentBatch.length} lines | ${Math.round(estimatedSize / 1024)}KB`,
        );

        yield batch;

        currentBatch = [];
        corruptCount = 0;
        emptyCount = 0;
        whitespaceCount = 0;
      }
    }

    if (currentBatch.length > 0) {
      batchNumber++;
      totalProcessed += currentBatch.length;

      const estimatedSize = currentBatch.reduce(
        (sum, line) => sum + Buffer.byteLength(line, "utf8"),
        0,
      );

      yield {
        batchNumber,
        rawLines: currentBatch,
        metadata: {
          batchNumber,
          encoding,
          lineCount: currentBatch.length,
          estimatedSizeBytes: estimatedSize,
          linesRemovedAsCorrupt: corruptCount,
          emptyLinesRemoved: emptyCount,
          whitespaceLinesRemoved: whitespaceCount,
        },
        totalProcessedSoFar: totalProcessed,
      };
    }

    logger.info(
      `[PREPROCESS] Complete: ${totalProcessed} lines across ${batchNumber} batches`,
    );
  }

  async *preprocess(
    filePath: string,
    config?: PreprocessingConfig,
  ): AsyncGenerator<PreprocessedBatch> {
    try {
      yield* this.preprocessLines(filePath, config);
    } catch (error) {
      logger.error(`[PREPROCESS] Error:`, error);
      throw error;
    }
  }
}

export const preprocessorService = new PreprocessorService();
