import { BaseDetector, MicroPattern } from "./base.detector";

export class JsonDetector extends BaseDetector {
  protected readonly logType = "JSON";
  protected readonly parserName = "jsonParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "isJsonObjectOrArray",
      // Line starts and ends with {} or []
      regex: /^\s*(?:\{.*\}|\[.*\])\s*$/,
      weight: 2,
      isCritical: true
    },
    {
      name: "hasCommonLogKeys",
      // Looks for standard generic logging keys
      regex: /"(?:timestamp|time|level|severity|message|msg|error)"\s*:/i,
      weight: 1
    }
  ];
}

export const jsonDetector = new JsonDetector();