export enum FindingSeverity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  MEDIUM_HIGH = "MEDIUM_HIGH",
  LOW = "LOW",
  INFO = "INFO",
}

export const severityOrder = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  MEDIUM_HIGH: 2.5,
  LOW: 4,
  INFO: 5,
};
