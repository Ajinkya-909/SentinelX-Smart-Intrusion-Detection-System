import { Worker } from "bullmq";
import { getRedis } from "../config/redis";
import { processJob } from "./job";

new Worker(
  "sentinelx-main-queue",
  async (job) => {
    await processJob(job.data);
  },
  {
    connection: getRedis(),
  }
);