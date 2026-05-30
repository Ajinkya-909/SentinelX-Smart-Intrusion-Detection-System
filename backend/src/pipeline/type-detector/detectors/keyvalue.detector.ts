import { BaseDetector, MicroPattern } from "./base.detector";

export class KeyValueDetector extends BaseDetector {
  protected readonly logType = "KEY_VALUE";
  protected readonly parserName = "keyValueParser";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasEqualsDelimiter",
      // Looks for key=value patterns (e.g., src=192.168.1.1 or user='admin')
      regex: /\b[a-zA-Z0-9_-]+\s*=\s*['"]?[a-zA-Z0-9_.-]+['"]?/i,
      weight: 1
    },
    {
      name: "hasColonDelimiter",
      // Looks for key: value patterns (non-JSON)
      regex: /\b[a-zA-Z0-9_-]+\s*:\s*[a-zA-Z0-9_.-]+/i,
      weight: 1
    },
    {
      name: "hasMultiplePairs",
      // Checks if there are at least two key-value pairs in the same line
      regex: /(?:\b[a-zA-Z0-9_-]+\s*[=:]\s*[^=\s]+.*){2,}/i,
      weight: 2
    }
  ];
}

export const keyValueDetector = new KeyValueDetector();