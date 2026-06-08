import path from "path";
import fs from "fs";
import { preprocessorService } from "../../src/pipeline/preprocessor/preprocessor.service";
import { typeDetectorService } from "../../src/pipeline/type-detector/type-detector.service";
import { parserService } from "../../src/pipeline/parser/parser.service";
import { getFieldMapping, normalizeSeverity, normalizeEventType } from "../../src/pipeline/normalizer/mappings";

// Simple case-insensitive field extractor mimicking normalizer.service.ts
function extractField(log: Record<string, any>, fieldAliases: string | string[] | undefined): any {
  if (!fieldAliases) return null;
  const aliases = Array.isArray(fieldAliases) ? fieldAliases : [fieldAliases];

  for (const alias of aliases) {
    const keys = alias.split('.');
    let current: any = log;
    for (const key of keys) {
      if (current === undefined || current === null || typeof current !== "object") {
        current = undefined;
        break;
      }
      const foundKey = Object.keys(current).find(k => k.toLowerCase() === key.toLowerCase());
      current = foundKey ? current[foundKey] : undefined;
    }
    if (current !== undefined && current !== null && current !== "") {
      return current;
    }
  }
  return null;
}

async function testFullPipeline() {
  const filePath = path.resolve(__dirname, "../../../sentinelx_test_logs/firewall_logs/new_logs.csv");
  console.log(`Testing full pipeline on: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: test file not found at ${filePath}`);
    process.exit(1);
  }

  // 1. Preprocess
  console.log("\n--- 1. PREPROCESSING ---");
  const generator = preprocessorService.preprocess(filePath, { batchSize: 10 });
  const firstBatchResult = await generator.next();
  if (firstBatchResult.done || !firstBatchResult.value) {
    console.error("Error: preprocessing yielded no batches.");
    process.exit(1);
  }
  const batch = firstBatchResult.value;
  console.log(`Successfully preprocessed first batch of ${batch.rawLines.length} lines.`);
  console.log(`Sample preprocessed line:\n${batch.rawLines[0]}`);

  // 2. Type Detect
  console.log("\n--- 2. TYPE DETECTION ---");
  const detection = await typeDetectorService.detect(batch.rawLines);
  console.log(`Detected Type: ${detection.detectedType}`);
  console.log(`Confidence: ${detection.confidence}`);
  console.log(`Parser: ${detection.parser}`);

  if (detection.detectedType !== "FIREWALL_LOG") {
    console.error("❌ Test Failed: Expected detectedType to be FIREWALL_LOG");
    process.exit(1);
  } else {
    console.log("✅ Type Detection Passed!");
  }

  // 3. Parse Batch
  console.log("\n--- 3. PARSING ---");
  const parseResult = await parserService.parseBatch(batch.rawLines, detection.detectedType);
  console.log(`Parse success rate: ${(parseResult.successRate * 100).toFixed(1)}%`);
  console.log(`Successfully parsed: ${parseResult.parsedLogs.length} logs`);

  if (parseResult.parsedLogs.length === 0) {
    console.error("❌ Test Failed: No parsed logs returned");
    process.exit(1);
  }

  const sampleParsedLog = parseResult.parsedLogs[0];
  if (!sampleParsedLog) {
    console.error("❌ Test Failed: No parsed logs found in the batch");
    process.exit(1);
  }
  console.log("Sample Parsed Log properties:", Object.keys(sampleParsedLog));
  console.log("Sample Parsed Log timestamp:", sampleParsedLog.timestamp);
  console.log("Sample Parsed Log sourceIp:", sampleParsedLog.sourceIp);
  console.log("Sample Parsed Log user:", sampleParsedLog.user);
  console.log("Sample Parsed Log message:", sampleParsedLog.message);
  console.log("Sample Parsed Log rule_name (promoted key):", sampleParsedLog["firewall rule name"]);

  // 4. Normalization Mappings test
  console.log("\n--- 4. MAPPING AND NORMALIZATION ---");
  const mapping = getFieldMapping(detection.detectedType);
  console.log("Firewall Mapping aliases:", mapping);

  const timestamp = extractField(sampleParsedLog, mapping.timestamp);
  const sourceIp = sampleParsedLog.sourceIp || extractField(sampleParsedLog, mapping.sourceIp);
  const user = sampleParsedLog.user || extractField(sampleParsedLog, mapping.user);
  const rawAction = extractField(sampleParsedLog, mapping.eventType);
  const eventType = normalizeEventType(rawAction);
  const logLevelRaw = extractField(sampleParsedLog, mapping.logLevel);
  const severity = normalizeSeverity(logLevelRaw);

  console.log(`Extracted field: timestamp = ${timestamp}`);
  console.log(`Extracted field: sourceIp = ${sourceIp}`);
  console.log(`Extracted field: user = ${user}`);
  console.log(`Extracted field: rawAction = ${rawAction} -> normalized eventType = ${eventType}`);
  console.log(`Extracted field: logLevelRaw = ${logLevelRaw} -> normalized severity = ${severity}`);

  if (sourceIp !== "45.147.66.142") {
    console.error(`❌ Test Failed: Expected sourceIp to be 45.147.66.142, got ${sourceIp}`);
    process.exit(1);
  }
  if (eventType !== "NETWORK_ALLOW") {
    console.error(`❌ Test Failed: Expected eventType to be NETWORK_ALLOW, got ${eventType}`);
    process.exit(1);
  }
  
  console.log("\n✅ ALL FULL PIPELINE TESTS PASSED SUCCESSFULLY!");
}

testFullPipeline().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
