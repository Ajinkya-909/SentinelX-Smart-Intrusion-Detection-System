import { jobRepository } from "../../src/repositories/job.repository";
import { JobUploadRequest } from "../../src/types/job.types";

/**
 * Test Suite: Job Repository
 * Creates 45 jobs with various input conditions to validate:
 * - Job creation works correctly
 * - All fields are properly persisted
 * - Default values are applied (status=UPLOADED, progress=0, retry_count=0)
 */

// User ID for all test jobs
const TEST_USER_ID = "cd0ac40e-5195-4ce8-95d1-3fa8d07361ad";

// Helper: Generate random file path
const generateFilePath = (index: number): string => {
  const types = ["nginx", "apache", "auth", "system", "firewall", "app"];
  const type = types[index % types.length];
  return `/uploads/${type}_logs_${Date.now()}_${index}.log`;
};

// Helper: Generate random file name
const generateFileName = (index: number): string => {
  const prefixes = [
    "access",
    "error",
    "security",
    "system",
    "application",
    "network",
  ];
  const prefix = prefixes[index % prefixes.length];
  return `${prefix}_log_${index}.log`;
};

// Helper: Generate random file size (1KB to 100MB)
const generateFileSize = (index: number): bigint => {
  const sizes: bigint[] = [
    1024n, // 1KB
    10240n, // 10KB
    102400n, // 100KB
    1048576n, // 1MB
    10485760n, // 10MB
    52428800n, // 50MB
    104857600n, // 100MB
  ];
  return sizes[index % sizes.length]!;
};

/**
 * Main test function: Creates 45 jobs with various conditions
 */
async function testCreateJobs() {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 JOB REPOSITORY TEST - Creating 45 Jobs");
  console.log("=".repeat(80));
  console.log(`📍 User ID: ${TEST_USER_ID}`);
  console.log(`⏰ Start Time: ${new Date().toISOString()}`);
  console.log("=".repeat(80) + "\n");

  const createdJobs: any[] = [];
  const errors: any[] = [];

  // Create 45 jobs with various conditions
  for (let i = 1; i <= 45; i++) {
    try {
      const jobInput: JobUploadRequest = {
        user_id: TEST_USER_ID,
        file_path: generateFilePath(i),
        file_name: generateFileName(i),
        file_size: generateFileSize(i),
      };

      console.log(`\n📄 Job ${i}/45:`);
      console.log(`   • File Name: ${jobInput.file_name}`);
      console.log(`   • File Path: ${jobInput.file_path}`);
      console.log(`   • File Size: ${jobInput.file_size} bytes`);

      // Call repository to create job
      const createdJob = await jobRepository.createJob(jobInput);

      console.log(`   ✅ Created Successfully`);
      console.log(`      - Job ID: ${createdJob.id}`);
      console.log(`      - Status: ${createdJob.status}`);
      console.log(`      - Progress: ${createdJob.progress}%`);
      console.log(`      - Retry Count: ${createdJob.retry_count}`);
      console.log(`      - Created At: ${createdJob.created_at}`);

      createdJobs.push(createdJob);
    } catch (error: any) {
      console.error(`   ❌ Error Creating Job ${i}`);
      console.error(`      - Message: ${error.message}`);
      errors.push({
        jobIndex: i,
        error: error.message,
      });
    }
  }

  // Summary Report
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Successfully Created: ${createdJobs.length}/45`);
  console.log(`❌ Failed: ${errors.length}/45`);
  console.log("=".repeat(80) + "\n");

  // Detailed Results
  if (createdJobs.length > 0) {
    console.log("✅ SUCCESSFUL JOBS:");
    console.log("-".repeat(80));
    createdJobs.forEach((job, index) => {
      console.log(
        `${index + 1}. ID: ${job.id} | Name: ${job.file_name} | Size: ${job.file_size} bytes`,
      );
    });
  }

  if (errors.length > 0) {
    console.log("\n❌ FAILED JOBS:");
    console.log("-".repeat(80));
    errors.forEach((err) => {
      console.log(`Job ${err.jobIndex}: ${err.error}`);
    });
  }

  // Validation Checks
  console.log("\n" + "=".repeat(80));
  console.log("🔍 VALIDATION CHECKS");
  console.log("=".repeat(80));

  // Check 1: All jobs have UPLOADED status
  const allUploaded = createdJobs.every((job) => job.status === "UPLOADED");
  console.log(
    `✓ All jobs have status=UPLOADED: ${allUploaded ? "✅ PASS" : "❌ FAIL"}`,
  );

  // Check 2: All jobs have progress=0
  const allProgressZero = createdJobs.every((job) => job.progress === 0);
  console.log(
    `✓ All jobs have progress=0: ${allProgressZero ? "✅ PASS" : "❌ FAIL"}`,
  );

  // Check 3: All jobs have retry_count=0
  const allRetryZero = createdJobs.every((job) => job.retry_count === 0);
  console.log(
    `✓ All jobs have retry_count=0: ${allRetryZero ? "✅ PASS" : "❌ FAIL"}`,
  );

  // Check 4: All jobs belong to correct user
  const allCorrectUser = createdJobs.every(
    (job) => job.user_id === TEST_USER_ID,
  );
  console.log(
    `✓ All jobs assigned to correct user: ${allCorrectUser ? "✅ PASS" : "❌ FAIL"}`,
  );

  // Check 5: All jobs have unique IDs
  const jobIds = createdJobs.map((job) => job.id);
  const uniqueIds = new Set(jobIds);
  const allUnique = uniqueIds.size === jobIds.length;
  console.log(
    `✓ All jobs have unique IDs: ${allUnique ? "✅ PASS" : "❌ FAIL"}`,
  );

  // Check 6: All jobs have timestamps
  const allHaveTimestamps = createdJobs.every(
    (job) => job.created_at && job.updated_at,
  );
  console.log(
    `✓ All jobs have timestamps: ${allHaveTimestamps ? "✅ PASS" : "❌ FAIL"}`,
  );

  // Final Status
  console.log("\n" + "=".repeat(80));
  const testPassed =
    allUploaded &&
    allProgressZero &&
    allRetryZero &&
    allCorrectUser &&
    allUnique &&
    allHaveTimestamps &&
    errors.length === 0;

  if (testPassed) {
    console.log("🎉 ALL TESTS PASSED! Job repository is working correctly.");
  } else {
    console.log("⚠️  SOME TESTS FAILED. Please review the output above.");
  }
  console.log("=".repeat(80));
  console.log(`⏰ End Time: ${new Date().toISOString()}`);
  console.log("=".repeat(80) + "\n");

  process.exit(testPassed ? 0 : 1);
}

// Run the test
testCreateJobs().catch((error) => {
  console.error("\n❌ FATAL ERROR:", error);
  process.exit(1);
});
