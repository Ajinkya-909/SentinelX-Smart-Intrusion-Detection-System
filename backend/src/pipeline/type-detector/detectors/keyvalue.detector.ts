import { BaseDetector, MicroPattern } from "./base.detector";

export class KeyValueDetector extends BaseDetector {
  protected readonly logType = "KEY_VALUE";
  protected readonly parserName = "keyValueParser";

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasStrictEqualsPairs",
      // Strictly matches format WITHOUT spaces around equals: key=value
      // Requires at least two pairs to avoid accidental matches in normal text
      regex: /(?:[a-zA-Z0-9_.-]+=[^\s,]+(?:[\s,]|$)){2,}/,
      weight: 3
    },
    {
      name: "hasDensePairs",
      // Ensures the line is densely populated with pairs (at least 3 valid key=value or key:value sequences)
      regex: /(?:(?:[a-zA-Z0-9_.-]+[=:][^\s,]+)[\s,]*){3,}/,
      weight: 3
    },
    {
      name: "hasCefOrLefHeader",
      // Specifically matches Common Event Format (CEF) or Log Event Format (LEF) which are essentially strict KV
      regex: /^(?:CEF|LEF):\d+/,
      weight: 4
    }
  ];
}

export const keyValueDetector = new KeyValueDetector();