export const analyzerService = {
  async analyze(jobId: string, normalizedLogs: any[]): Promise<any[]> {
    console.log(
      `[ANALYZER] Analyzing ${normalizedLogs.length} logs for job ${jobId}`,
    );
    return [];
  },
};
