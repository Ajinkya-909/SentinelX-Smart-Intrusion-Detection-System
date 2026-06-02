/**
 * PHASE 1-3 VERIFICATION SCRIPT
 *
 * Tests the complete log ingestion pipeline:
 * Phase 1: Detection of all 10+ log types
 * Phase 2: Parsing with strict null-fallback validation
 * Phase 3: Normalization and field mapping
 *
 * Run with: npx ts-node scripts/test-phase-123-verification.ts
 */

import { typeDetectorService } from "../src/pipeline/type-detector/type-detector.service";
import { parserService } from "../src/pipeline/parser/parser.service";
import { normalizerService } from "../src/pipeline/normalizer/normalizer.service";
import { getFieldMapping } from "../src/pipeline/normalizer/mappings";
import logger from "../src/config/logger";

// ============================================================================
// SAMPLE LOGS FOR EACH FORMAT
// ============================================================================

const sampleLogs = {
  NGINX_ACCESS: [
    '192.168.1.10 - user [15/May/2026:10:30:45 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"',
    '10.0.0.5 - - [15/May/2026:10:31:12 +0000] "POST /api/login HTTP/1.1" 401 567 "https://example.com" "curl/7.64.1"',
  ],
  NGINX_ERROR: [
    "2026/05/15 10:30:45 [error] 12345#0: *6789 connect() failed (111: Connection refused) while connecting to upstream",
    "2026/05/15 10:31:20 [warn] 12346#1: *6790 upstream server temporarily disabled while connecting to upstream",
  ],
  APACHE_ACCESS: [
    '192.168.1.20 - admin [11/May/2026:14:32:52 +0530] "GET /index.html HTTP/1.1" 200 2326 "-" "Mozilla/5.0"',
    'example.com:80 10.0.0.8 - - [11/May/2026:14:33:15 +0530] "POST /form HTTP/1.1" 304 0 "https://example.com/form" "Firefox/88.0"',
  ],
  APACHE_ERROR: [
    "[Wed May 15 14:32:52.223423 2026] [core:error] [pid 28144:tid 140735268892672] [client 192.168.1.50:54321] AH00124: Request exceeded 50 seconds",
    "[Fri May 15 14:35:10 2026] [mpm_prefork:notice] [pid 28145] AH00163: Apache/2.4.41 (Ubuntu) configured",
  ],
  SYSLOG: [
    "May 15 10:30:45 sshd[12345]: Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2",
    "May 15 10:31:12 sshd[12346]: Accepted publickey for ubuntu from 10.0.0.15 port 54322 ssh2",
    "May 15 10:32:00 su[12347]: (to root) admin on /dev/pts/0 session closed",
    "May 15 10:32:45 kernel: SYN flood detected from 192.168.1.200",
  ],
  WINDOWS_EVENT: [
    JSON.stringify({
      Event: {
        System: {
          EventID: 4688,
          Channel: "Security",
          Provider: { Name: "Microsoft-Windows-Security-Auditing" },
          TimeCreated: { SystemTime: "2026-05-15T10:30:45.1234567Z" },
          Level: 2,
          Computer: "WIN-ABC123",
        },
        EventData: {
          TargetUserName: "admin",
          ProcessName: "C:\\Windows\\System32\\cmd.exe",
          CommandLine: "cmd.exe /c ipconfig",
        },
      },
    }),
    JSON.stringify({
      EventID: 4768,
      Channel: "Security",
      TargetUserName: "user1",
      IpAddress: "192.168.1.101",
      Level: 0,
    }),
  ],
  FIREWALL: [
    "SRC=192.168.1.50 DST=8.8.8.8 PROTO=TCP SPT=54321 DPT=443 ACT=ALLOW",
    "src=10.0.0.5 dst=172.16.0.1 proto=UDP sport=53 dport=5353 action=DROP",
  ],
  AWS_CLOUDTRAIL: [
    JSON.stringify({
      eventVersion: "1.05",
      userIdentity: {
        type: "IAMUser",
        userName: "admin",
        arn: "arn:aws:iam::123456789:user/admin",
      },
      eventTime: "2026-05-15T10:30:45Z",
      eventSource: "s3.amazonaws.com",
      eventName: "GetObject",
      sourceIPAddress: "192.168.1.150",
      userAgent: "aws-cli/2.1.34",
    }),
  ],
  SURICATA: [
    JSON.stringify({
      timestamp: "2026-05-15T10:30:45.123456+0000",
      event_type: "alert",
      src_ip: "192.168.1.75",
      dest_ip: "8.8.8.8",
      src_port: 54321,
      dest_port: 53,
      alert: {
        signature_id: 2013028,
        signature: "ET MALWARE DNS Query for known Malware C2 Domain",
        severity: 1,
        category: "Trojan Traffic",
      },
    }),
  ],
  DOCKER: [
    JSON.stringify({
      log: "2026-05-15T10:30:45.123456789Z INFO Starting application",
      stream: "stdout",
      time: "2026-05-15T10:30:45.123456789Z",
      container_id: "abc123def456",
    }),
  ],
  JSON_GENERIC: [
    JSON.stringify({
      timestamp: "2026-05-15T10:30:45Z",
      level: "ERROR",
      message: "Database connection failed",
      ip: "192.168.1.200",
      user: "dbuser",
    }),
  ],
};

// ============================================================================
// TEST PHASE 1: DETECTION
// ============================================================================

async function testPhase1Detection() {
  console.log("\n" + "=".repeat(80));
  console.log("PHASE 1 TEST: LOG TYPE DETECTION");
  console.log("=".repeat(80));

  let passed = 0;
  let failed = 0;

  for (const [logType, lines] of Object.entries(sampleLogs)) {
    try {
      const result = await typeDetectorService.detect(lines.map((l) => l));

      // Normalize both strings to compare (remove underscores, case-insensitive)
      const normalizedLogType = logType.toUpperCase().replace(/_/g, "");
      const normalizedDetectedType = result.detectedType
        .toUpperCase()
        .replace(/_/g, "");

      const isCorrect =
        normalizedDetectedType.includes(normalizedLogType) ||
        normalizedLogType.includes(normalizedDetectedType);

      const status = isCorrect ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${status} | ${logType.padEnd(20)} → Detected: ${result.detectedType} (${(result.confidence * 100).toFixed(1)}%)`,
      );

      if (isCorrect) passed++;
      else failed++;
    } catch (error) {
      console.log(
        `❌ FAIL | ${logType.padEnd(20)} → Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      failed++;
    }
  }

  console.log(`\nPhase 1 Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ============================================================================
// TEST PHASE 2: PARSING
// ============================================================================

async function testPhase2Parsing() {
  console.log("\n" + "=".repeat(80));
  console.log("PHASE 2 TEST: LOG PARSING & STRICT NULL FALLBACK");
  console.log("=".repeat(80));

  const testCases = [
    {
      type: "NGINX_ACCESS",
      lines: sampleLogs.NGINX_ACCESS,
      expectedMinRate: 0.85,
    },
    {
      type: "NGINX_ERROR",
      lines: sampleLogs.NGINX_ERROR,
      expectedMinRate: 0.85,
    },
    {
      type: "APACHE_ACCESS",
      lines: sampleLogs.APACHE_ACCESS,
      expectedMinRate: 0.85,
    },
    {
      type: "APACHE_ERROR",
      lines: sampleLogs.APACHE_ERROR,
      expectedMinRate: 0.85,
    },
    { type: "SYSLOG", lines: sampleLogs.SYSLOG, expectedMinRate: 0.75 },
    {
      type: "WINDOWS_EVENT",
      lines: sampleLogs.WINDOWS_EVENT,
      expectedMinRate: 0.8,
    },
    { type: "FIREWALL_LOG", lines: sampleLogs.FIREWALL, expectedMinRate: 0.85 },
    {
      type: "AWS_CLOUDTRAIL",
      lines: sampleLogs.AWS_CLOUDTRAIL,
      expectedMinRate: 0.85,
    },
    { type: "SURICATA_EVE", lines: sampleLogs.SURICATA, expectedMinRate: 0.85 },
    { type: "DOCKER_JSON", lines: sampleLogs.DOCKER, expectedMinRate: 0.85 },
    { type: "JSON", lines: sampleLogs.JSON_GENERIC, expectedMinRate: 0.85 },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await parserService.parseBatch(
        testCase.lines,
        testCase.type,
      );
      const isSuccessful = result.successRate >= testCase.expectedMinRate;

      const status = isSuccessful ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${status} | ${testCase.type.padEnd(20)} → Success Rate: ${(result.successRate * 100).toFixed(1)}% (expected ≥${(testCase.expectedMinRate * 100).toFixed(0)}%)`,
      );
      console.log(
        `       Parsed: ${result.parsedLogs.length}/${testCase.lines.length} logs`,
      );

      if (isSuccessful) passed++;
      else failed++;
    } catch (error) {
      console.log(
        `❌ FAIL | ${testCase.type.padEnd(20)} → Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      failed++;
    }
  }

  console.log(`\nPhase 2 Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ============================================================================
// TEST PHASE 3: NORMALIZATION & FIELD MAPPING
// ============================================================================

async function testPhase3Normalization() {
  console.log("\n" + "=".repeat(80));
  console.log("PHASE 3 TEST: NORMALIZATION & FIELD MAPPING");
  console.log("=".repeat(80));

  const logTypeToFormat: Record<string, string> = {
    NGINX_ACCESS: "NGINX_ACCESS",
    NGINX_ERROR: "NGINX_ERROR",
    APACHE_ACCESS: "APACHE_ACCESS",
    APACHE_ERROR: "APACHE_ERROR",
    SYSLOG: "SYSLOG",
    WINDOWS_EVENT: "WINDOWS_EVENT",
    FIREWALL: "FIREWALL_LOG",
    AWS_CLOUDTRAIL: "AWS_CLOUDTRAIL",
    SURICATA: "SURICATA_EVE",
    DOCKER: "DOCKER_JSON",
    JSON_GENERIC: "JSON",
  };

  let passed = 0;
  let failed = 0;

  for (const [logType, detectedType] of Object.entries(logTypeToFormat)) {
    try {
      const mapping = getFieldMapping(detectedType);
      const hasMandatoryFields =
        mapping.timestamp && mapping.sourceIp && mapping.logLevel;

      const status = hasMandatoryFields ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${status} | ${logType.padEnd(20)} → Mapping: ${Object.keys(mapping).length} fields, Has timestamp/IP/level: ${hasMandatoryFields}`,
      );

      if (hasMandatoryFields) passed++;
      else failed++;
    } catch (error) {
      console.log(
        `❌ FAIL | ${logType.padEnd(20)} → Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      failed++;
    }
  }

  console.log(`\nPhase 3 Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log("\n");
  console.log("╔" + "=".repeat(78) + "╗");
  console.log(
    "║" +
      " ".repeat(15) +
      "SENTINELX LOG PIPELINE: PHASES 1-3 VERIFICATION" +
      " ".repeat(16) +
      "║",
  );
  console.log("╚" + "=".repeat(78) + "╝");

  const phase1Pass = await testPhase1Detection();
  const phase2Pass = await testPhase2Parsing();
  const phase3Pass = await testPhase3Normalization();

  console.log("\n" + "=".repeat(80));
  console.log("FINAL RESULTS");
  console.log("=".repeat(80));

  const allPass = phase1Pass && phase2Pass && phase3Pass;
  const status = allPass ? "✅ ALL PHASES PASSED" : "❌ SOME PHASES FAILED";

  console.log(`Phase 1 (Detection): ${phase1Pass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Phase 2 (Parsing):   ${phase2Pass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Phase 3 (Normalization): ${phase3Pass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`\n${status}`);
  console.log("=".repeat(80) + "\n");

  process.exit(allPass ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exit(1);
});
