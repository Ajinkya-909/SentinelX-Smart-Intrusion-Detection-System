import { getJobQueue } from ".";
import { QueuedJobPayload } from "../types/queue.types";

export const enqueueJob = async (payload: QueuedJobPayload) => {
  const jobQueue = getJobQueue();
  const queueJob = await jobQueue.add("processLogs", payload);
  return queueJob;
};
