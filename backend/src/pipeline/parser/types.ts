// Existing interfaces...
export interface ParsedLog {
  timestamp: Date | string;
  logLevel: string;
  message: string;
  sourceIp?: string;
  user?: string;
  statusCode?: number;
  raw: string;
  [key: string]: any;
}

export interface ParseError {
  lineNumber: number;
  rawLine: string;
  error: string;
}

export interface ParserStats {
  totalLines: number;
  successfullyParsed: number;
  failedToParse: number;
  averageParseTimeMs: number;
}

export interface ParserResult {
  success: boolean;
  parsedLogs: ParsedLog[];
  failedLines: ParseError[];
  stats: ParserStats;
}

// Add this new interface for the Orchestrator's Adaptive Loop
export interface BatchParseResult {
  parsedLogs: ParsedLog[];
  failedLines: string[]; // Just the raw strings for re-evaluation
  successRate: number;   // e.g., 0.95
  detectedTypeUsed: string;
}