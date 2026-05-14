export const normalizerService = {
  async normalize(jobId: string, parsedLogs: any[]): Promise<any[]> {
    console.log(
      `[NORMALIZER] Normalizing ${parsedLogs.length} logs for job ${jobId}`,
    );
    return [];
  },
};
