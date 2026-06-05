import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";

export const bruteForceCampaignDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];
    const bruteForceIps = new Map<string, { failedAttempts: number; usernames: Set<string>; logIds: string[] }>();

    // 1. Filter only logs that indicate authentication failures
    const failedAuthLogs = ctx.logs.filter(log => log.metadata?.security?.authSuccess === false);

    for (const log of failedAuthLogs) {
      if (!log.ip_address) continue;
      
      const entry = bruteForceIps.get(log.ip_address) || { failedAttempts: 0, usernames: new Set<string>(), logIds: [] };
      entry.failedAttempts++;
      
      const username = log.metadata?.actor?.username;
      if (username) {
        entry.usernames.add(username);
      }
      
      const logId = log.id || "";
      entry.logIds.push(logId);
      bruteForceIps.set(log.ip_address, entry);
    }

    // Filter IPs that meet the brute force threshold (e.g., >= 10 failed attempts)
    const activeBruteForceIps: string[] = [];
    let totalFailedAttempts = 0;
    const allUsernames = new Set<string>();
    const allLogReferences: string[] = [];

    for (const [ip, data] of bruteForceIps) {
      if (data.failedAttempts >= 10) {
        activeBruteForceIps.push(ip);
        totalFailedAttempts += data.failedAttempts;
        data.usernames.forEach(u => allUsernames.add(u));
        allLogReferences.push(...data.logIds.slice(0, 10)); // Keep a subset of log references
      }
    }

    if (activeBruteForceIps.length > 0) {
      // We have active brute-forcing IP(s)!
      // Determine if it is a coordinated campaign (multiple IPs) or a single targeted campaign
      const isCoordinated = activeBruteForceIps.length >= 3;
      const isCredentialStuffing = allUsernames.size >= 5;

      let title = "SSH Brute-Force Attack Campaign Detected";
      let summary = `Detected systematic SSH brute-force attempts from IP(s) targeting local accounts.`;
      let description = "";
      let severity = FindingSeverity.HIGH;

      if (isCoordinated) {
        title = "Coordinated Distributed SSH Brute-Force Campaign";
        summary = `Multiple external IPs (${activeBruteForceIps.length}) are performing a coordinated brute-force attack campaign.`;
        description = `A distributed brute-force attack campaign was identified from ${activeBruteForceIps.length} unique source IPs: ${activeBruteForceIps.join(", ")}. A total of ${totalFailedAttempts} failed login attempts targeted ${allUsernames.size} unique accounts.`;
        severity = FindingSeverity.HIGH; // Not CRITICAL as no compromise was observed
      } else {
        const mainIp = activeBruteForceIps[0];
        if (mainIp) {
          const ipData = bruteForceIps.get(mainIp)!;
          if (isCredentialStuffing) {
            title = "Credential Stuffing / Username Enumeration Campaign";
            summary = `IP ${mainIp} is performing credential stuffing and username guessing attacks.`;
            description = `IP ${mainIp} made ${ipData.failedAttempts} failed login attempts across ${ipData.usernames.size} different usernames, indicating automated username guessing and credential stuffing.`;
            severity = FindingSeverity.HIGH;
          } else {
            title = "Targeted SSH Brute-Force Attack";
            summary = `IP ${mainIp} is brute-forcing authentication credentials.`;
            description = `IP ${mainIp} made ${ipData.failedAttempts} rapid failed login attempts targeting account(s): ${Array.from(ipData.usernames).join(", ") || "root"}.`;
            severity = FindingSeverity.HIGH;
          }
        }
      }

      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "correlation",
          finding_type: "BRUTE_FORCE_AUTH",
          severity: severity,
          confidence: 0.99,
          title: title,
          summary: summary,
          description: description,
          log_references: allLogReferences.slice(0, 50), // Cap log references
          affected_entities: {
            ip_addresses: activeBruteForceIps,
            usernames: Array.from(allUsernames),
          },
          evidence: {
            attacker_ips: activeBruteForceIps,
            target_usernames: Array.from(allUsernames),
            total_failed_attempts: totalFailedAttempts,
            is_coordinated: isCoordinated,
            is_credential_stuffing: isCredentialStuffing,
          },
          metadata: {
            rule_id: "corr_brute_force_campaign",
            active_ips_count: activeBruteForceIps.length,
            total_failed_attempts: totalFailedAttempts,
          },
          recommendation: "HIGH: Deploy Fail2Ban or IP rate-limiting block rules immediately for the identified attacker IPs. Consider disabling password authentication on SSH and enforcing SSH key-only access."
        })
      );
    }

    return findings;
  }
};
