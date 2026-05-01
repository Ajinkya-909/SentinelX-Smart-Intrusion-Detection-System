import { Queue } from "bullmq";
import { getRedis } from "../config/redis";

export const jobQueue = new Queue("sentinelx-main-queue", {
  connection: getRedis(),
});
