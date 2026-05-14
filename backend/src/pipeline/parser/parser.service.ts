export const parserService = {
  async parse(jobId: string, filePath: string): Promise<any[]> {
    console.log(`[PARSER] Parsing job ${jobId} from ${filePath}`);
    return [];
  },
};
