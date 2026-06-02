import { typeDetectorService } from "../src/pipeline/type-detector/type-detector.service";
import { parserService } from "../src/pipeline/parser/parser.service";

const samples = {
  NGINX_ACCESS: [
    '127.0.0.1 - - [02/Jun/2026:06:11:50 +0000] "GET /index.html HTTP/1.1" 200 1024 "http://referrer.com" "Mozilla/5.0"',
    '192.168.1.100 - - [02/Jun/2026:06:11:51 +0000] "POST /api/login HTTP/1.1" 401 256 "-" "curl/7.68.0"'
  ],
  NGINX_ERROR: [
    '2026/06/02 06:11:50 [error] 12345#0: *6789 open() "/var/www/html/favicon.ico" failed (2: No such file or directory), client: 1.1.1.1, server: localhost',
    '2026/06/02 06:11:51 [warn] 12345#0: *6790 conflicting server name "example.com" on 0.0.0.0:80, ignored'
  ],
  APACHE_ACCESS: [
    '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
    'vhost.example.com:80 192.168.1.50 - - [02/Jun/2026:06:11:50 +0530] "GET /images/logo.png HTTP/1.1" 304 0'
  ],
  APACHE_ERROR: [
    '[Wed Oct 11 14:32:52.223423 2026] [core:error] [pid 1234:tid 5678] [client 1.1.1.1:56231] AH00124: Request exceeded the limit of 10 internal redirects',
    '[Sun Jun 01 02:18:14 2026] [error] [client 127.0.0.1] client denied by server configuration: /var/www/html/restricted',
    '[Sun Jun 01 02:18:14.341103 2026] [mpm_prefork:info] [pid 28144] AH00163: Apache/2.4.41 (Ubuntu) configured -- resuming normal operations'
  ],
  SYSLOG: [
    'Jun  2 06:11:50 ubuntu sshd[123]: Failed password for invalid user admin from 192.168.1.50 port 42130 ssh2',
    '2026-06-02T06:11:50.003Z myhost systemd[1]: Started System Logging Service.'
  ],
  WINDOWS_EVENT: [
    '{"Event":{"System":{"Provider":{"Name":"Microsoft-Windows-Security-Auditing","Guid":"{54848525-2C70-4E34-A4E2-48B7902E3C6F}"},"EventID":4625,"Version":0,"Level":0,"Task":12544,"Opcode":0,"Keywords":"0x8020000000000000","TimeCreated":{"SystemTime":"2026-06-02T06:11:50.123Z"},"EventRecordID":98231,"Correlation":null,"Execution":{"ProcessID":4,"ThreadID":8},"Channel":"Security","Computer":"DESKTOP-WIN10","Security":null},"EventData":{"SubjectUserSid":"S-1-5-18","SubjectUserName":"DESKTOP-WIN$","SubjectDomainName":"WORKGROUP","SubjectLogonId":"0x3e7","TargetUserSid":"S-1-0-0","TargetUserName":"administrator","TargetDomainName":"DESKTOP-WIN10","Status":"0xc000006d","SubStatus":"0xc0000064","IpAddress":"192.168.1.10","IpPort":"53210"}}}'
  ],
  FIREWALL_LOG: [
    'timestamp=2026-06-02T06:11:50Z device=firewall action=deny src=192.168.1.50 dst=10.0.0.1 sport=42130 dport=80 proto=TCP',
    'CEF:0|Fortinet|FortiGate|v6.0|1|traffic|1|device=firewall src=192.168.1.50 dst=10.0.0.1 sport=42130 dport=80 proto=6 action=deny'
  ],
  SURICATA_EVE: [
    '{"timestamp":"2026-06-02T06:11:50.123456+0000","flow_id":987213,"event_type":"alert","src_ip":"192.168.1.50","src_port":42130,"dest_ip":"10.0.0.1","dest_port":80,"proto":"TCP","alert":{"action":"allowed","gid":1,"signature_id":2010001,"rev":1,"signature":"ET SCAN potential SSH brute force","category":"Attempted Information Leak","severity":2}}'
  ],
  AWS_CLOUDTRAIL: [
    '{"eventVersion":"1.08","userIdentity":{"type":"IAMUser","userName":"alice","arn":"arn:aws:iam::123456789012:user/alice"},"eventTime":"2026-06-02T06:11:50Z","eventSource":"signin.amazonaws.com","eventName":"ConsoleLogin","awsRegion":"us-east-1","sourceIPAddress":"192.168.1.50","userAgent":"Mozilla/5.0"}',
  ],
  DOCKER_JSON: [
    '{"log":"Jun  2 06:11:50 sshd[123]: Failed password for root\\n","stream":"stdout","time":"2026-06-02T06:11:50.123456789Z"}'
  ]
};

async function testAll() {
  console.log("=== STARTING DETECTOR & PARSER VERIFICATION ===");
  let failed = 0;

  for (const [expectedType, lines] of Object.entries(samples)) {
    try {
      // 1. Test Detection
      const detectResult = await typeDetectorService.detect(lines);
      console.log(`[DETECT] Expected: ${expectedType} | Detected: ${detectResult.detectedType} (Confidence: ${(detectResult.confidence * 100).toFixed(1)}%)`);
      if (detectResult.detectedType !== expectedType) {
        console.error(`❌ DETECT FAILED: Expected ${expectedType} but got ${detectResult.detectedType}`);
        failed++;
        console.log("--------------------------------------");
        continue;
      }
      console.log(`✅ DETECT PASSED`);

      // 2. Test Parsing
      const parseResult = await parserService.parseBatch(lines, detectResult.detectedType);
      console.log(`[PARSE] Success Rate: ${(parseResult.successRate * 100).toFixed(1)}% | Extracted Count: ${parseResult.parsedLogs.length}`);

      if (parseResult.successRate < 1.0) {
        console.error(`❌ PARSE FAILED: Success rate is ${parseResult.successRate}, expected 1.0`);
        failed++;
      } else {
        console.log(`✅ PARSE PASSED`);
        // Verify key properties are present
        for (let i = 0; i < parseResult.parsedLogs.length; i++) {
          const log = parseResult.parsedLogs[i]!;
          console.log(`  Log #${i + 1} Properties:`);
          console.log(`    Timestamp : ${new Date(log.timestamp).toISOString()} (raw: ${log.raw.substring(0, 40)}...)`);
          console.log(`    LogLevel  : ${log.logLevel}`);
          console.log(`    Message   : ${log.message.substring(0, 100)}`);
          if (log.sourceIp) console.log(`    SourceIP  : ${log.sourceIp}`);
          if (log.user) console.log(`    User      : ${log.user}`);
          if (log.statusCode) console.log(`    StatusCode: ${log.statusCode}`);
          if (log.metadata) console.log(`    Metadata  : ${JSON.stringify(log.metadata)}`);
        }
      }
    } catch (e) {
      console.error(`❌ ERROR testing ${expectedType}:`, e);
      failed++;
    }
    console.log("--------------------------------------");
  }

  // 3. Test Strict Parser Rejection (pass invalid text to strict parsers)
  console.log("=== TESTING STRICT PARSER REJECTIONS ===");
  const badLines = ["This is random text that should not match Nginx or Syslog formats."];
  
  try {
    const nginxResult = await parserService.parseBatch(badLines, "NGINX_ACCESS");
    console.log(`Nginx rejection success rate: ${(nginxResult.successRate * 100).toFixed(1)}%`);
    if (nginxResult.successRate > 0) {
      console.error("❌ ERROR: Nginx parser accepted random text!");
      failed++;
    } else {
      console.log("✅ Nginx parser successfully rejected invalid line.");
    }
  } catch (e) {
    console.log("✅ Nginx parser rejected invalid line via throw (acceptable).");
  }

  try {
    const syslogResult = await parserService.parseBatch(badLines, "SYSLOG");
    console.log(`Syslog rejection success rate: ${(syslogResult.successRate * 100).toFixed(1)}%`);
    if (syslogResult.successRate > 0) {
      console.error("❌ ERROR: Syslog parser accepted random text!");
      failed++;
    } else {
      console.log("✅ Syslog parser successfully rejected invalid line.");
    }
  } catch (e) {
    console.log("✅ Syslog parser rejected invalid line via throw (acceptable).");
  }

  console.log("--------------------------------------");

  if (failed > 0) {
    console.error(`❌ Verification failed: ${failed} tests failed.`);
    process.exit(1);
  } else {
    console.log("🎉 All detector and parser verifications PASSED successfully!");
    process.exit(0);
  }
}

testAll();
