import { BaseDetector, MicroPattern } from "./base.detector";

export class JsonDetector extends BaseDetector {
  protected readonly logType = "JSON";
  protected readonly parserName = "jsonParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasStrictJsonEnvelope",
      // Strictly ensures line starts with { and contains a valid "key": format immediately
      regex: /^\s*\{\s*"[^"]+"\s*:/,
      weight: 3,
      isCritical: true
    },
    {
      name: "hasDenseJsonKeys",
      // Looks for at least 3 JSON keys to ensure it's a complex log object, not just {"status": "ok"}
      regex: /(?:"[^"]+"\s*:\s*){3,}/,
      weight: 2
    },
    {
      name: "hasCommonLogKeys",
      // Matches standard generic logging keys inside double quotes
      regex: /"(?:timestamp|time|level|severity|message|msg|error|source|host)"\s*:/i,
      weight: 2
    }
  ];
}

export const jsonDetector = new JsonDetector();