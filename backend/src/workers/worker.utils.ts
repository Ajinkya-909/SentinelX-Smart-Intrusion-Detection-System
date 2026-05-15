import { QueuedJobPayload } from "../types/queue.types";
import { JobStageEnum } from "../types/db.types";

export const getNextStage = (
  lastCompletedStage: JobStageEnum | null,
): JobStageEnum => {
  const stageOrder = [
    JobStageEnum.UPLOADED,
    JobStageEnum.PREPROCESSED,
    JobStageEnum.TYPE_DETECTED,
    JobStageEnum.PARSED,
    JobStageEnum.NORMALIZED,
    JobStageEnum.ANALYZED,
    JobStageEnum.INSIGHTS_GENERATED,
    JobStageEnum.COMPLETED,
  ];

  if (!lastCompletedStage) {
    return stageOrder[0]!;
  }

  const currentIndex = stageOrder.indexOf(lastCompletedStage);
  return stageOrder[currentIndex + 1] || JobStageEnum.COMPLETED;
};

export const isJobResumable = (
  lastCompletedStage: JobStageEnum | null,
): boolean => {
  return lastCompletedStage !== null;
};

export const formatJobPayload = (payload: QueuedJobPayload): string => {
  return `Job(${payload.job_id}): File=${payload.file_name}, Stage=${payload.last_completed_stage || "FRESH"}`;
};
