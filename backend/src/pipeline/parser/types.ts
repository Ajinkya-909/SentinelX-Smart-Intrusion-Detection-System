/**
 * Parser Output Types
 * These are the transient structures used between Parser and Normalizer stages
 */

/**
 * Parsed Log Entry
 * Intermediate structure output by parsers
 * NOT persisted to database - only exists in memory during pipeline execution
 */
export interface ParsedLog {
  timestamp: Date | string;
  logLevel: string;
  message: string;
  sourceIp?: string;
  user?: string;
  statusCode?: number;
  raw: string;
  [key: string]: any; // Allow parser-specific metadata
}

/**
 * Parser Result
 * Return type from parse() operations
 */
export interface ParserResult {
  success: boolean;
  parsedLogs: ParsedLog[];
  failedLines: ParseError[];
  stats: ParserStats;
}

/**
 * Parse Error
 * Tracks lines that failed to parse
 */
export interface ParseError {
  lineNumber: number;
  rawLine: string;
  error: string;
}

/**
 * Parser Statistics
 * Metrics about parsing operation
 */
export interface ParserStats {
  totalLines: number;
  successfullyParsed: number;
  failedToParse: number;
  averageParseTimeMs: number;
}
