import { BaseDetector, MicroPattern } from "./base.detector";

export class SuricataDetector extends BaseDetector {
  protected readonly logType = "SURICATA_EVE";
  protected readonly parserName = "jsonParserV1";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasSuricataEventType",
      // Suricata always explicitly declares the event type (alert, dns, http, tls, flow)
      regex: /"event_type"\s*:\s*"(?:alert|http|dns|tls|fileinfo|flow|stats)"/i,
      weight: 3,
      isCritical: true
    },
    {
      name: "hasAlertSignature",
      // The most critical part of an IDS log
      regex: /"alert"\s*:\s*\{.*"signature_id"\s*:/i,
      weight: 3
    },
    {
      name: "hasNetworkTuple",
      // Fast check for source/dest IP keys in JSON
      regex: /"src_ip"\s*:\s*"[\d\.]+".*"dest_ip"\s*:\s*"[\d\.]+"/i,
      weight: 2
    }
  ];
}

export const suricataDetector = new SuricataDetector();