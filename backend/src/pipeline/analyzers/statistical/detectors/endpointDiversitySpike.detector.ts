import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { grouping } from "../../shared/utils/grouping.util";
import { statistics } from "../../shared/utils/statistics.util";

export const endpointDiversitySpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    const endpointLogs = ctx.logs.filter(log => log.metadata?.action?.endpoint);
    if (endpointLogs.length < 50) return findings;

    const logsByIp = grouping.groupByIp(endpointLogs);
    const diversityPerIp = new Map<string, number>();
    const diversityCounts: number[] = [];

    for (const [ip, logs] of logsByIp) {
      if (ip === "unknown") continue;
      
      // Count how many UNIQUE endpoints this IP visited
      const uniqueEndpoints = new Set(logs.map(l => l.metadata!.action!.endpoint)).size;
      diversityPerIp.set(ip, uniqueEndpoints);
      diversityCounts.push(uniqueEndpoints);
    }

    if (diversityCounts.length < 3) return findings;

    const meanDiversity = statistics.mean(diversityCounts);
    const stddevDiversity = statistics.stddev(diversityCounts);

    for (const [ip, uniqueCount] of diversityPerIp.entries()) {
      // If an IP hits > 50 unique endpoints AND is acting > 3 standard deviations above the average user
      if (uniqueCount > 50 && uniqueCount > (meanDiversity + (stddevDiversity * 3))) {
        
        const zScore = statistics.zScore(uniqueCount, meanDiversity, stddevDiversity);

        findings.push(
          createFinding({
            jobId: ctx.jobId,
            analyzer: "statistical",
            finding_type: "ENDPOINT_DIVERSITY_SPIKE",
            severity: FindingSeverity.HIGH,
            confidence: Math.min(0.95, 0.7 + (Math.abs(zScore) * 0.05)),
            title: "Anomalous Endpoint Diversity (Scanning)",
            summary: `IP ${ip} accessed ${uniqueCount} unique endpoints, mathematically proving scanner/enumeration behavior.`,
            log_references: logsByIp.get(ip)?.slice(0, 50).map((l: any) => l.id) || [],
            affected_entities: {
              ip_address: ip,
              unique_endpoints_targeted: uniqueCount
            },
            evidence: {
              unique_endpoints_hit: uniqueCount,
              crowd_mean_endpoints: Math.round(meanDiversity),
              z_score: Math.round(zScore * 100) / 100,
            },
            metadata: { rule_id: "stat_2_2" },
            recommendation: "Block IP immediately. Attacker is enumerating the server looking for hidden vulnerabilities, backups, or admin panels.",
          }),
        );
      }
    }

    return findings;
  },
};