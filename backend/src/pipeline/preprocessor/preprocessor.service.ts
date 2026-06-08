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
  private createFileStream(filePath: string, encoding: string): fs.ReadStream {
    logger.info(`[PREPROCESS] Opening file stream: ${filePath} with encoding: ${encoding}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return fs.createReadStream(filePath, {
      encoding: encoding as BufferEncoding,
      highWaterMark: 64 * 1024,
    });
  }

  private async detectEncoding(filePath: string): Promise<string> {
    let fileHandle: fsPromises.FileHandle | null = null;
    try {
      fileHandle = await fsPromises.open(filePath, "r");
      const buffer = Buffer.alloc(4);
      const { bytesRead } = await fileHandle.read(buffer, 0, 4, 0);

      if (bytesRead < 2) {
        return "utf8";
      }

      // Check for BOM (Byte Order Mark)
      if (
        bytesRead >= 3 &&
        buffer[0] === 0xef &&
        buffer[1] === 0xbb &&
        buffer[2] === 0xbf
      ) {
        return "utf8";
      }

      if (
        (buffer[0] === 0xff && buffer[1] === 0xfe) ||
        (buffer[0] === 0xfe && buffer[1] === 0xff)
      ) {
        return "utf16le";
      }

      return "utf8";
    } catch (error) {
      logger.error(`[PREPROCESS] Error detecting encoding for ${filePath}:`, error);
      return "utf8";
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
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
    const trimmed = line.trim();
    // Filter out structural markers from exported log files
    if (trimmed === "{" || trimmed === "}" || trimmed === "[" || trimmed === "]") {
      return "";
    }
    if (/^[a-zA-Z0-9\s_-]+ logs?:?\s*\{?$/i.test(trimmed)) {
      return "";
    }
    return trimmed;
  }

  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(col => col.replace(/^"(.*)"$/, '$1'));
  }

  private hasCsvHeader(columns: string[]): boolean {
    if (columns.length === 0) return false;

    let dataLooks = 0;

    for (const col of columns) {
      const trimmed = col.trim();
      
      // If a column is empty, it could be a blank header or missing value.
      if (trimmed === "") {
        continue;
      }

      // If a column is a number, it's data
      if (!isNaN(Number(trimmed))) {
        dataLooks++;
        continue;
      }

      // IP address check
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
        dataLooks++;
        continue;
      }

      // Domain name check: contains a dot, is not a simple identifier, and does not match a typical nested header name.
      if (trimmed.includes(".") && !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(trimmed)) {
        dataLooks++;
        continue;
      }

      // Timestamp check
      if (
        /\d{4}-\d{2}-\d{2}/.test(trimmed) || 
        /\d{2}\/\d{2}\/\d{4}/.test(trimmed) || 
        /\d{2}:\d{2}:\d{2}/.test(trimmed)
      ) {
        dataLooks++;
        continue;
      }
    }

    return dataLooks === 0;
  }

  async *preprocessLines(
    filePath: string,
    config: PreprocessingConfig = {},
  ): AsyncGenerator<PreprocessedBatch> {
    const batchSize = config.batchSize || 1000;
    const maxLineLength = config.maxLineLengthBytes || 100 * 1024;

    const encoding = await this.detectEncoding(filePath);

    // Try single JSON file parsing
    let isSingleJsonArray = false;
    let jsonArrayItems: string[] = [];

    const isJson = filePath.toLowerCase().endsWith(".json") && 
                   !filePath.toLowerCase().endsWith(".jsonl") && 
                   !filePath.toLowerCase().endsWith(".ndjson");

    if (isJson) {
      try {
        const fileStat = await fsPromises.stat(filePath);
        const MAX_SINGLE_PARSE = 32 * 1024 * 1024; // 32MB

        if (fileStat.size <= MAX_SINGLE_PARSE) {
          let fileContent = await fsPromises.readFile(filePath, encoding as BufferEncoding);
          if (fileContent.startsWith("\ufeff")) {
            fileContent = fileContent.slice(1);
          }
          const parsed = JSON.parse(fileContent);
          if (Array.isArray(parsed)) {
            isSingleJsonArray = true;
            jsonArrayItems = parsed.map(item => typeof item === "object" ? JSON.stringify(item) : String(item));
          } else if (parsed && typeof parsed === "object") {
            isSingleJsonArray = true;
            jsonArrayItems = [JSON.stringify(parsed)];
          }
        } else {
          logger.info(`[PREPROCESS] JSON file ${filePath} is larger than ${Math.round(MAX_SINGLE_PARSE/1024/1024)}MB (${fileStat.size} bytes). Falling back to line-by-line.`);
        }
      } catch (err) {
        logger.info(`[PREPROCESS] JSON file ${filePath} could not be parsed as a single JSON document. Falling back to line-by-line.`);
      }
    }

    if (isSingleJsonArray) {
      let batchNumber = 0;
      let totalProcessed = 0;
      for (let i = 0; i < jsonArrayItems.length; i += batchSize) {
        const currentBatch = jsonArrayItems.slice(i, i + batchSize);
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
            linesRemovedAsCorrupt: 0,
            emptyLinesRemoved: 0,
            whitespaceLinesRemoved: 0,
          },
          totalProcessedSoFar: totalProcessed,
        };
      }
      logger.info(
        `[PREPROCESS] Complete JSON array: ${totalProcessed} lines across ${batchNumber} batches`,
      );
      return;
    }

    const fileStream = this.createFileStream(filePath, encoding);
    const lineReader = this.createLineReader(fileStream);

    const isCsv = filePath.toLowerCase().endsWith(".csv");
    let csvHeaders: string[] | null = null;

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

      let finalLine = cleanedLine;

      if (isCsv) {
        const columns = this.splitCsvLine(cleanedLine);
        if (!csvHeaders) {
          if (this.hasCsvHeader(columns)) {
            csvHeaders = columns.map((c, i) => c || `column_${i}`);
            continue; // Skip the header row
          } else {
            csvHeaders = columns.map((_, i) => `column_${i}`);
          }
        }

        const obj: Record<string, string> = {};
        for (let i = 0; i < csvHeaders.length; i++) {
          const key = csvHeaders[i];
          if (key) {
            obj[key] = columns[i] || "";
          }
        }
        finalLine = JSON.stringify(obj);
      }

      currentBatch.push(finalLine);

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
