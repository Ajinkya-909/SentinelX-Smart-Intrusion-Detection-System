import fs from 'fs';
import path from 'path';
import { preprocessorService } from "../src/pipeline/preprocessor/preprocessor.service";
import { typeDetectorService } from "../src/pipeline/type-detector/type-detector.service";
import { parserService } from "../src/pipeline/parser/parser.service";
import { normalizeLog } from "../src/pipeline/normalizer/normalizer.service";
import { getFieldMapping } from "../src/pipeline/normalizer/mappings";

// You can change this path to any file you want to test
const TEST_FILE_PATH = "d:\\CodingContent\\Web Development\\SentinelX — Smart Intrusion Detection System\\sentinelx_test_logs\\Apache_2k.log";
const OUTPUT_FILE_PATH = path.join(__dirname, "..", "scratch", "pipeline_test_output.json");

async function runTest() {
  console.log("==================================================");
  console.log(`🚀 STARTING PIPELINE FILE TEST ON: ${TEST_FILE_PATH}`);
  console.log("==================================================\n");

  if (!fs.existsSync(TEST_FILE_PATH)) {
    console.error(`❌ File not found: ${TEST_FILE_PATH}`);
    return;
  }

  // Ensure scratch dir exists
  const outDir = path.dirname(OUTPUT_FILE_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outputLog: any = {
    testFile: TEST_FILE_PATH,
    timestamp: new Date().toISOString(),
    batches: []
  };

  try {
    let batchCount = 0;
    let detectionResult: any = null;

    // We use the same generator as orchestrator-simple.ts
    for await (const batch of preprocessorService.preprocess(TEST_FILE_PATH)) {
      batchCount++;
      console.log(`\n📦 [BATCH #${batchCount}] Processing ${batch.metadata.lineCount} lines...`);

      const batchLog: any = {
        batchNumber: batchCount,
        lineCount: batch.metadata.lineCount,
        preprocessingMetadata: batch.metadata,
        stages: {}
      };

      // ---------------------------------------------------------
      // 1. TYPE DETECTOR (Initial baseline on first batch)
      // ---------------------------------------------------------
      if (batchCount === 1) {
        console.log("🔍 [STAGE 1] Initial Type Detection...");
        detectionResult = await typeDetectorService.detect(batch.rawLines);
        console.log(`   ✅ Detected: ${detectionResult.detectedType} (Conf: ${(detectionResult.confidence * 100).toFixed(1)}%)`);
        batchLog.stages.typeDetection = detectionResult;
      }

      // ---------------------------------------------------------
      // 2. PARSER (Adaptive Loop just like orchestrator)
      // ---------------------------------------------------------
      console.log(`🧩 [STAGE 2] Parsing batch with ${detectionResult.detectedType}...`);
      const MIN_SUCCESS_THRESHOLD = 0.85;
      const MAX_RETRIES = 2;
      let retryCount = 0;
      let parseResult: any = null;
      let currentParserType = detectionResult.detectedType;
      const parsingAttempts = [];

      while (retryCount <= MAX_RETRIES) {
        parseResult = await parserService.parseBatch(batch.rawLines, currentParserType);

        parsingAttempts.push({
          attempt: retryCount + 1,
          parserTypeUsed: currentParserType,
          successRate: parseResult.successRate,
          parsedLogsCount: parseResult.parsedLogs.length,
          failedLinesCount: parseResult.failedLines.length
        });

        if (parseResult.successRate >= MIN_SUCCESS_THRESHOLD || currentParserType === "GENERIC") {
          break;
        }

        console.warn(`   ⚠️ Parser ${currentParserType} failed threshold (${(parseResult.successRate * 100).toFixed(1)}%). Re-detecting...`);
        const newDetection = await typeDetectorService.detect(batch.rawLines, { exclude: [currentParserType] });
        currentParserType = newDetection.detectedType === currentParserType ? "GENERIC" : newDetection.detectedType;
        detectionResult = newDetection;
        retryCount++;
      }

      if (parseResult.successRate < MIN_SUCCESS_THRESHOLD && currentParserType !== "GENERIC") {
        console.warn(`   ⚠️ Exhausted retries. Forcing GENERIC fallback.`);
        currentParserType = "GENERIC";
        parseResult = await parserService.parseBatch(batch.rawLines, "GENERIC");
        detectionResult.detectedType = "GENERIC";
        parsingAttempts.push({
          attempt: retryCount + 2,
          parserTypeUsed: "GENERIC (Fallback)",
          successRate: parseResult.successRate,
          parsedLogsCount: parseResult.parsedLogs.length,
          failedLinesCount: parseResult.failedLines.length
        });
      }

      console.log(`   ✅ Parse Success Rate: ${(parseResult.successRate * 100).toFixed(1)}%`);
      batchLog.stages.parsing = {
        attempts: parsingAttempts,
        finalSuccessRate: parseResult.successRate,
        finalParserUsed: currentParserType,
        parsedLogs: parseResult.parsedLogs // Full response saved to output log
      };

      // ---------------------------------------------------------
      // 3. NORMALIZER
      // ---------------------------------------------------------
      console.log(`🔄 [STAGE 3] Normalizing batch...`);
      const sourceMapping = getFieldMapping(detectionResult.detectedType);
      const normalizedLogs = [];
      const jobId = "test-job-id-file-based";

      for (const parsedLog of parseResult.parsedLogs) {
        const normalized = normalizeLog(parsedLog, jobId, detectionResult.detectedType, sourceMapping);
        if (normalized) {
          normalizedLogs.push(normalized);
        }
      }

      console.log(`   ✅ Normalized: ${normalizedLogs.length}/${parseResult.parsedLogs.length} logs`);
      batchLog.stages.normalization = {
        successCount: normalizedLogs.length,
        normalizedLogs: normalizedLogs // Full response saved to output log
      };

      // Append this batch's results to the overall output log
      outputLog.batches.push(batchLog);
    }

    // Write the complete output to a JSON file
    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(outputLog, null, 2), 'utf-8');

    console.log("\n==================================================");
    console.log(`🎉 TEST FINISHED.`);
    console.log(`📂 ALL data (parsing & normalization) saved to:`);
    console.log(`   ${OUTPUT_FILE_PATH}`);
    console.log("==================================================");

  } catch (error) {
    console.error("❌ FATAL ERROR IN PIPELINE TEST:", error);
  }
}

runTest();
