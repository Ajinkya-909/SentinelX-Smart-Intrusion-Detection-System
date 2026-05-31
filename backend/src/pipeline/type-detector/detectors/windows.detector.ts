import { BaseDetector, MicroPattern } from "./base.detector";

export class WindowsEventDetector extends BaseDetector {
  protected readonly logType = "WINDOWS_EVENT";
  protected readonly parserName = "jsonParserV1"; 

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasWindowsEventEnvelope",
      // Looks for strict Windows Event JSON structures (Provider: Microsoft-Windows-...)
      regex: /"Event"\s*:\s*\{\s*"System"\s*:\s*\{.*"Provider"\s*:\s*\{.*"Name"\s*:\s*"Microsoft-Windows/i,
      weight: 5,
      isCritical: true
    },
    {
      name: "hasFlatWindowsEnvelope",
      // Fallback for flat JSON exports of Windows Events, requires EventID AND Channel
      regex: /"EventID"\s*:\s*\d+.*"Channel"\s*:\s*"(?:Security|System|Application|Setup)"/i,
      weight: 4
    }
  ];
}

export const windowsEventDetector = new WindowsEventDetector();