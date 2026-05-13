import { jobQueue } from ".";
import { QueuedJobPayload } from "../types/queue.types";

export const enqueueJob = async (payload: QueuedJobPayload) => {
  const queueJob = await jobQueue.add("processLogs", payload);
  return queueJob;
};
