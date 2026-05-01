import { Queue } from "bullmq";
import { jobQueue } from ".";

export const addJob = async () => {
  // Add multiple dummy jobs for testing
  const jobs = [
    { jobId: 'job-001', fileName: 'access.log', filePath: '/uploads/access.log' },
    { jobId: 'job-002', fileName: 'error.log', filePath: '/uploads/error.log' },
    { jobId: 'job-003', fileName: 'security.log', filePath: '/uploads/security.log' },
  ];

  for (const job of jobs) {
    const added = await jobQueue.add('process-log', job);
    console.log(`✅ Job added to queue: ${job.jobId} (Queue ID: ${added.id})`);
  }
};
export const processJob = async (data: any) => {
  const { jobId } = data;

  console.log("Job started:", jobId);

  await fakeStage("PARSE");
  await fakeStage("NORMALIZE");
  await fakeStage("ANALYZE");
  await fakeStage("INSIGHTS");

  console.log("Job completed:", jobId);
};

const fakeStage = async (stage: string) => {
  console.log(`Stage: ${stage}`);
  await new Promise((res) => setTimeout(res, 500));
};