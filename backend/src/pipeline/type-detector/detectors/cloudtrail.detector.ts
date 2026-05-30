import { BaseDetector, MicroPattern } from "./base.detector";

export class CloudTrailDetector extends BaseDetector {
  protected readonly logType = "AWS_CLOUDTRAIL";
  protected readonly parserName = "jsonParserV1"; 

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasUserIdentity",
      // Looks for the standard AWS IAM identity block
      regex: /"userIdentity"\s*:\s*\{/i,
      weight: 3,
      isCritical: true
    },
    {
      name: "hasEventSource",
      // Looks for service identifiers like "s3.amazonaws.com" or "iam.amazonaws.com"
      regex: /"eventSource"\s*:\s*"[a-zA-Z0-9.-]+\.amazonaws\.com"/i,
      weight: 2
    },
    {
      name: "hasAwsRegion",
      regex: /"awsRegion"\s*:\s*"[a-z]{2}-[a-z]+-\d{1}"/i,
      weight: 1
    },
    {
      name: "hasEventVersion",
      regex: /"eventVersion"\s*:\s*"\d+\.\d+"/i,
      weight: 1
    }
  ];
}

export const cloudTrailDetector = new CloudTrailDetector();