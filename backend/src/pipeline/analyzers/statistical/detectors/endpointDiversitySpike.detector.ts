import { IDetector } from "../../shared/interfaces/Detector.interface";
import { AnalyzerFinding } from "../../shared/findings/Finding.types";
import { AnalysisContext } from "../../shared/context/AnalysisContext";
import { FindingSeverity } from "../../shared/findings/FindingSeverity";
import { createFinding } from "../../shared/findings/createFinding";
import { correlation } from "../../shared/utils/correlation.util";

/**
 * DETECTOR 4: Endpoint Diversity Spike
 *
 * Triggers when:
 * - User/IP accesses abnormally high number of unique endpoints
 * - Indicates scanning or reconnaissance behavior
 */
export const endpointDiversitySpikeDetector: IDetector = {
  async detect(ctx: AnalysisContext): Promise<AnalyzerFinding[]> {
    const findings: AnalyzerFinding[] = [];

    if (ctx.logs.length === 0) return findings;

    // Calculate average endpoints accessed per entity
    const endpointCounts: { entity: string; count: number; logs: any[] }[] = [];

    // By user
    for (const [userId, timeline] of ctx.entityTimelines) {
      if (!userId.startsWith("user_")) continue;

      const endpoints = correlation.getDistinctValues(timeline, "endpoint");
      if (endpoints.size > 10) {
        // Arbitrary high threshold
        endpointCounts.push({
          entity: userId,
          count: endpoints.size,
          logs: timeline,
        });
      }
    }

    // By IP
    for (const [ipKey, timeline] of ctx.entityTimelines) {
      if (!ipKey.startsWith("ip_")) continue;

      const endpoints = correlation.getDistinctValues(timeline, "endpoint");
      if (endpoints.size > 20) {
        // Higher threshold for IPs
        endpointCounts.push({
          entity: ipKey,
          count: endpoints.size,
          logs: timeline,
        });
      }
    }

    // Generate findings
    for (const { entity, count, logs } of endpointCounts) {
      findings.push(
        createFinding({
          jobId: ctx.jobId,
          analyzer: "statistical",
          finding_type: "ENDPOINT_DIVERSITY_SPIKE",
          severity: FindingSeverity.MEDIUM,
          confidence: 0.8,
          title: "Endpoint Diversity Spike Detected",
          summary: `Entity ${entity} accessed unusually high number of unique endpoints`,
          log_references: logs.map((log) => log.id),
          affected_entities: {
            entity,
            unique_endpoints_count: count,
          },
          evidence: {
            unique_endpoints: count,
            total_requests: logs.length,
            avg_requests_per_endpoint:
              logs.length > 0
                ? Math.round((logs.length / count) * 100) / 100
                : 0,
          },
          metadata: {
            rule_id: "stat_1_4",
            rule_version: "1.0",
          },
          recommendation:
            "Investigate entity for scanning/reconnaissance behavior. Review endpoint access patterns.",
        }),
      );
    }

    return findings;
  },
};

