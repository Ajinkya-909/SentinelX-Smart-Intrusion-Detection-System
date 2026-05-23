export const analyzerConfig = {
  // ===== SIGNATURE & RULE ANALYZER =====
  bruteForce: {
    threshold: 50, // failed attempts
    windowSeconds: 300, // 5 minutes
    rapidThreshold: 10, // rapid velocity
    rapidWindow: 30, // 30 seconds
  },

  accountTakeover: {
    ipChangeWindow: 3600, // 60 minutes
    ipVelocityThreshold: 60, // seconds for impossible travel
    minTimeGapMinutes: 5, // allow normal user behavior
  },

  privileEscalation: {
    adminAccessAttempts: 3,
    windowMinutes: 10,
  },

  maliciousPayload: {
    sqlInjectionPatterns: [
      "OR '1'='1",
      "UNION SELECT",
      "DROP TABLE",
      "INSERT INTO",
      "DELETE FROM",
      "EXEC(",
      ";--",
      "'/*",
      "SELECT * FROM",
      "--",
      "/*",
      "*/",
    ],
    xssPatterns: [
      "<script>",
      "javascript:",
      "onerror=",
      "onload=",
      "eval(",
      "onclick=",
      "onmouseover=",
      "<img",
      "<iframe",
    ],
    pathTraversalPatterns: ["../", "..\\", "%2e%2e/", "%2e%2e%5c", "..;/"],
    dangerousExtensions: [
      ".exe",
      ".bat",
      ".cmd",
      ".com",
      ".sh",
      ".bash",
      ".zsh",
      ".jar",
      ".class",
      ".asp",
      ".aspx",
      ".jsp",
      ".php",
      ".dll",
      ".so",
      ".dylib",
      ".scr",
      ".vbs",
    ],
  },

  scannerBotPatterns: [
    "sqlmap",
    "nikto",
    "nmap",
    "masscan",
    "shodan",
    "nessus",
    "qualys",
    "burp",
    "zaproxy",
  ],

  // ===== STATISTICAL ANALYZER =====
  statistical: {
    spikeMultiplier: 5.0,
    baselineWindowHours: 1,
    zScoreThreshold: 3.0,
    errorRateMultiplier: 3.0,
    dataTransferStdDevMultiplier: 3.0,
    endpointDiversityMultiplier: 3.0,
    criticalEventMultiplier: 5.0,
  },

  // ===== TEMPORAL ANALYZER =====
  temporal: {
    burst: {
      threshold: 100, // requests
      windowSeconds: 30,
    },
    reconnaissance: {
      threshold: 50,
      failureRatio: 0.5,
      uniqueEndpoints: 10,
      windowMinutes: 5,
    },
    offHours: {
      startHour: 22,
      endHour: 6,
      businessDays: [1, 2, 3, 4, 5], // Mon-Fri (0=Sunday)
    },
    session: {
      durationMultiplier: 3.0,
      baselineDays: 30,
    },
    intervals: {
      minIntervalMs: 500,
    },
  },

  // ===== CORRELATION ANALYZER =====
  correlation: {
    reconnaissanceWindow: 600, // 10 minutes
    exploitationWindow: 300, // 5 minutes
    escalationWindow: 120, // 2 minutes
    dataExfilWindow: 1800, // 30 minutes
    lateralMovementWindow: 3600, // 1 hour
    sessionHijackWindow: 3600, // 1 hour
  },

  // ===== GLOBAL SETTINGS =====
  global: {
    confidenceMinimum: 0.6, // Don't report findings below this
    severityLevels: {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      MEDIUM_HIGH: 2.5,
      LOW: 4,
      INFO: 5,
    },
  },
};

export const loadAnalyzerConfig = () => {
  // Allow ENV overrides
  return {
    ...analyzerConfig,
    bruteForce: {
      threshold: parseInt(
        process.env.ANALYZER_BRUTE_FORCE_THRESHOLD || "50",
        10,
      ),
      windowSeconds: parseInt(
        process.env.ANALYZER_BRUTE_FORCE_WINDOW || "300",
        10,
      ),
      rapidThreshold: parseInt(
        process.env.ANALYZER_RAPID_THRESHOLD || "10",
        10,
      ),
      rapidWindow: parseInt(process.env.ANALYZER_RAPID_WINDOW || "30", 10),
    },
    statistical: {
      spikeMultiplier: parseFloat(
        process.env.ANALYZER_SPIKE_MULTIPLIER || "5.0",
      ),
      zScoreThreshold: parseFloat(
        process.env.ANALYZER_Z_SCORE_THRESHOLD || "3.0",
      ),
    },
    global: {
      confidenceMinimum: parseFloat(
        process.env.ANALYZER_CONFIDENCE_MIN || "0.6",
      ),
    },
  };
};
