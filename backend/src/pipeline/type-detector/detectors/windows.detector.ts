import { BaseDetector, MicroPattern } from "./base.detector";

export class WindowsEventDetector extends BaseDetector {
  protected readonly logType = "WINDOWS_EVENT";
  // We can let the adaptive loop fallback to JSON or KeyValue parsers based on the file wrapper,
  // but identifying it as WINDOWS_EVENT helps the normalizer map fields correctly.
  protected readonly parserName = "jsonParserV1"; 

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasEventId",
      // Looks for EventID: 4624 or "EventID": 4624
      regex: /"EventID"\s*:\s*\d+|\bEventID\b\s*=?\s*\d+/i,
      weight: 3,
      isCritical: true // Without an EventID, it's virtually useless as a Windows log
    },
    {
      name: "hasWindowsKeywords",
      regex: /\b(?:SubjectUserName|TargetUserName|LogonType|ComputerName|TimeCreated|EventRecordID)\b/,
      weight: 2
    },
    {
      name: "hasWindowsProvider",
      // Microsoft-Windows-Security-Auditing
      regex: /Microsoft-Windows-[a-zA-Z0-9-]+/i,
      weight: 2
    }
  ];
}

export const windowsEventDetector = new WindowsEventDetector();