import { BaseDetector, MicroPattern } from "./base.detector";

export class SuricataDetector extends BaseDetector {
  protected readonly logType = "SURICATA_EVE";
  protected readonly parserName = "jsonParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasSuricataEveEnvelope",
      // Suricata JSON always contains this strict combination of root keys
      regex: /\{.*"timestamp"\s*:\s*"[^"]+".*"event_type"\s*:\s*"(?:alert|http|dns|tls|fileinfo|flow|stats|ssh|smb|dcerpc)"/i,
      weight: 5,
      isCritical: true
    },
    {
      name: "hasAlertSignature",
      // Validates the inner IDS alert object structure
      regex: /"alert"\s*:\s*\{.*"signature_id"\s*:\s*\d+.*"signature"\s*:/i,
      weight: 4
    }
  ];
}

export const suricataDetector = new SuricataDetector();