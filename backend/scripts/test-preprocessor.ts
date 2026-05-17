import path from "path";
import fs from "fs";
import { PreprocessorService } from "../src/pipeline/preprocessor/preprocessor.service";

// ================================================
// SIMPLE PREPROCESSOR TEST SCRIPT
// ================================================

async function testPreprocessor(filePath: string): Promise<void> {
  const service = new PreprocessorService();

  console.log("\n" + "=".repeat(60));
  console.log("PREPROCESSOR TEST SCRIPT");
  console.log("=".repeat(60));
  console.log(`\nProcessing file: ${filePath}\n`);

  try {
    let totalLines = 0;
    let totalBatches = 0;
    let totalCorrupt = 0;
    let totalEmpty = 0;
    let totalWhitespace = 0;
    let totalBytes = 0;

    for await (const batch of service.preprocess(filePath, {
      batchSize: 1000,
    })) {
      totalBatches++;
      totalLines += batch.metadata.lineCount;
      totalCorrupt += batch.metadata.linesRemovedAsCorrupt;
      totalEmpty += batch.metadata.emptyLinesRemoved;
      totalWhitespace += batch.metadata.whitespaceLinesRemoved;
      totalBytes += batch.metadata.estimatedSizeBytes;

      console.log(`\n--- Batch #${batch.batchNumber} ---`);
      console.log(`Lines in batch: ${batch.metadata.lineCount}`);
      console.log(`Encoding: ${batch.metadata.encoding}`);
      console.log(
        `Size: ${(batch.metadata.estimatedSizeBytes / 1024).toFixed(2)} KB`,
      );
      console.log(
        `Lines removed: ${batch.metadata.linesRemovedAsCorrupt} corrupt, ${batch.metadata.emptyLinesRemoved} empty, ${batch.metadata.whitespaceLinesRemoved} whitespace`,
      );
      console.log(`Total processed so far: ${batch.totalProcessedSoFar}`);

      // Show first 3 lines of the batch
      if (batch.rawLines.length > 0) {
        console.log("\nFirst few lines:");
        batch.rawLines.slice(0, 3).forEach((line, index) => {
          const displayLine =
            line.length > 80 ? line.substring(0, 77) + "..." : line;
          console.log(`  ${index + 1}. ${displayLine}`);
        });

        if (batch.rawLines.length > 3) {
          console.log(`  ... and ${batch.rawLines.length - 3} more lines`);
        }
      }
    }

    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("FINAL SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total batches processed: ${totalBatches}`);
    console.log(`Total valid lines: ${totalLines}`);
    console.log(`Total size: ${(totalBytes / 1024).toFixed(2)} KB`);
    console.log(`\nLines removed:`);
    console.log(`  - Corrupt lines: ${totalCorrupt}`);
    console.log(`  - Empty lines: ${totalEmpty}`);
    console.log(`  - Whitespace-only lines: ${totalWhitespace}`);
    console.log(`\n✅ Preprocessing completed successfully!\n`);
  } catch (error) {
    console.error("\n❌ Error during preprocessing:");
    console.error((error as Error).message);
    process.exit(1);
  }
}

// ================================================
// MAIN EXECUTION
// ================================================

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("\n❌ Error: No file provided");
  console.error("\nUsage:");
  console.error("  ts-node scripts/test-preprocessor.ts <file-path>");
  console.error("\nExamples:");
  console.error(
    "  ts-node scripts/test-preprocessor.ts plan/test-files/system-logs-valid.txt",
  );
  console.error(
    "  ts-node scripts/test-preprocessor.ts plan/test-files/system-events-valid.csv",
  );
  console.error(
    "  ts-node scripts/test-preprocessor.ts plan/test-files/structured-logs-valid.json",
  );
  process.exit(1);
}

const filePath = (() => {
  const inputPath = args[0]!;

  // Try relative to current working directory first
  let resolvedPath = path.resolve(inputPath);
  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  // Try relative to workspace root (parent directory)
  resolvedPath = path.resolve(__dirname, "..", "..", inputPath);
  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  // Return the originally resolved path (will fail with appropriate error)
  return path.resolve(inputPath);
})();

testPreprocessor(filePath);
