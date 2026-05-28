import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  AlertTriangle,
  CheckCircle,
  Trash2,
  RotateCcw,
  Download,
  ArrowRight,
  Activity,
  FileText,
  Clock,
} from "lucide-react";
import { useFetchJobDetail, useJobActions } from "@/hooks";
import { Job } from "@/types/job";

const PIPELINE_STAGES = [
  "UPLOADED",
  "PREPROCESSED",
  "TYPE_DETECTED",
  "PARSED",
  "NORMALIZED",
  "ANALYZED",
  "INSIGHTS_GENERATED",
  "COMPLETED",
];

// Helper function to format dates safely
function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString("en-US", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    return "Invalid Date";
  }
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Phase 8 Hooks: Fetching & Actions
  const {
    job,
    isLoading,
    error: fetchError,
    isPolling,
  } = useFetchJobDetail(id!);
  const {
    handleRetry,
    handleDelete,
    handleReanalyze,
    handleDownload,
    retryState,
    deleteState,
    reanalyzeState,
    downloadState,
    isAnyLoading,
  } = useJobActions();

  // Current state (for UI rendering)
  const currentStatus = job?.status;
  const currentProgress = job?.progress ?? 0;
  const currentStage = job?.lastCompletedStage;

  if (isLoading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Activity className="animate-spin" />
        Initializing secure connection...
      </div>
    );
  }

  if (fetchError || !job) {
    return (
      <div className="p-8 text-destructive flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle />
          Failed to load job data.
        </div>
        {fetchError && (
          <p className="text-xs text-destructive/70 font-mono">{fetchError}</p>
        )}
      </div>
    );
  }

  // Debug: log job data to console
  console.log("Job Data:", job);

  return (
    <div className="container max-w-5xl py-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">
              {job.fileName || job.jobName || "Untitled Job"}
            </h1>
            <StatusBadge status={currentStatus} />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="font-mono space-y-1">
              <p>
                <span className="text-xs bg-muted/50 px-2 py-1 rounded inline-block">
                  ID: {job.jobId ? job.jobId.slice(0, 12) + "..." : "N/A"}
                </span>
              </p>
              <p>
                <span className="text-xs">
                  Size:{" "}
                  {job.fileSize
                    ? `${(job.fileSize / 1024).toFixed(2)} KB`
                    : "N/A"}{" "}
                  • Created: {formatDate(job.createdAt)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area: State Machine */}
      <main className="min-h-[400px]">
        {/* STATE A: PROCESSING */}
        {(currentStatus === "UPLOADED" || currentStatus === "PROCESSING") && (
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-lg p-8 glass">
              <div className="flex justify-between mb-4 font-mono text-sm">
                <span className="text-info flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-pulse" />
                  {isPolling ? "Analysis in Progress" : "Queued for Processing"}
                </span>
                <span className="text-foreground">{currentProgress}%</span>
              </div>

              {/* Linear Progress Bar */}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-8">
                <motion.div
                  className="h-full bg-info glow-info"
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgress}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                />
              </div>

              <Stepper currentStage={currentStage} />
            </div>
          </div>
        )}

        {/* STATE B: FAILED */}
        {currentStatus === "FAILED" && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-bold">Pipeline Execution Failed</h2>
            </div>
            <p className="text-destructive/80 font-mono text-sm bg-background p-4 rounded border border-destructive/20">
              {job.errorMessage ||
                "Unknown error encountered during processing."}
            </p>
            {retryState.error && (
              <p className="text-destructive/80 font-mono text-xs bg-background p-3 rounded border border-destructive/20">
                Retry Error: {retryState.error}
              </p>
            )}
            <div className="pt-4">
              <button
                onClick={() => handleRetry(job.jobId)}
                disabled={retryState.isLoading || isAnyLoading}
                className="flex items-center gap-2 bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-foreground px-4 py-2 rounded-md transition-colors border border-border"
              >
                {retryState.isLoading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {retryState.isLoading ? "Retrying..." : "Retry Analysis"}
              </button>
            </div>
          </div>
        )}

        {/* STATE C: COMPLETED */}
        {currentStatus === "COMPLETED" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                icon={<FileText className="text-primary w-5 h-5" />}
                label="File Size"
                value={
                  job.fileSize
                    ? `${(job.fileSize / 1024).toFixed(2)} KB`
                    : "N/A"
                }
              />
              <StatCard
                icon={<Terminal className="text-info w-5 h-5" />}
                label="Outcome"
                value={job.outcome || "SUCCESS"}
              />
              <StatCard
                icon={<Clock className="text-accent w-5 h-5" />}
                label="Completed At"
                value={formatDate(job.updatedAt)}
              />
            </div>

            {/* Processing Metadata Section */}
            {job.processingMetadata && (
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Detection Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">
                      Detected Type
                    </p>
                    <p className="font-mono text-foreground bg-muted/50 px-3 py-2 rounded inline-block">
                      {job.processingMetadata.detectedType || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">
                      Confidence
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(job.processingMetadata.confidence || 0) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <p className="font-mono text-foreground text-sm">
                        {(
                          (job.processingMetadata.confidence || 0) * 100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">
                      Parser Strategy
                    </p>
                    <p className="font-mono text-foreground bg-muted/50 px-3 py-2 rounded inline-block">
                      {job.processingMetadata.parser || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">
                      Encoding
                    </p>
                    <p className="font-mono text-foreground bg-muted/50 px-3 py-2 rounded inline-block">
                      {job.processingMetadata.encoding || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Matched Patterns */}
                {job.processingMetadata.patterns?.matched &&
                  job.processingMetadata.patterns.matched.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground uppercase">
                        Matched Patterns
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.processingMetadata.patterns.matched.map(
                          (pattern, idx) => (
                            <span
                              key={idx}
                              className="bg-primary/10 border border-primary/30 text-primary text-xs px-2 py-1 rounded font-mono"
                            >
                              {pattern}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* No Processing Metadata Available */}
            {!job.processingMetadata && (
              <div className="bg-muted/30 border border-border/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Detection analysis data not available for this job
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                onClick={() => navigate(`/jobs/${id}/report`)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-md font-bold transition-all glow-primary"
                disabled={isAnyLoading}
              >
                Access Security Report <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => handleReanalyze(job.jobId)}
                disabled={reanalyzeState.isLoading || isAnyLoading}
                className="flex items-center justify-center gap-2 bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed border border-border px-6 py-3 rounded-md transition-colors"
              >
                {reanalyzeState.isLoading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {reanalyzeState.isLoading ? "Reanalyzing..." : "Reanalyze"}
              </button>

              <button
                onClick={() => handleDownload(job.jobId, job.fileName)}
                disabled={downloadState.isLoading || isAnyLoading}
                className="flex items-center justify-center gap-2 bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed border border-border px-6 py-3 rounded-md transition-colors text-info"
              >
                {downloadState.isLoading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloadState.isLoading ? "Downloading..." : "Raw Log"}
              </button>
            </div>
            {downloadState.error && (
              <p className="text-destructive/80 font-mono text-xs bg-background p-3 rounded border border-destructive/20">
                Download Error: {downloadState.error}
              </p>
            )}
            {reanalyzeState.error && (
              <p className="text-destructive/80 font-mono text-xs bg-background p-3 rounded border border-destructive/20">
                Reanalyze Error: {reanalyzeState.error}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Global Destructive Action */}
      <footer className="pt-12 border-t border-border mt-12 flex justify-end">
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isAnyLoading}
          className="flex items-center gap-2 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm px-4 py-2"
        >
          <Trash2 className="w-4 h-4" /> Delete Job completely
        </button>
      </footer>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-card border border-destructive/30 p-6 rounded-lg shadow-xl max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-destructive mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Confirm Deletion
              </h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Are you absolutely sure? This will cascade delete all findings,
                AI insights, normalized logs, and the physical file from
                storage. This action cannot be undone.
              </p>
              {deleteState.error && (
                <p className="text-destructive/80 font-mono text-xs bg-background p-3 rounded border border-destructive/20 mb-4">
                  Delete Error: {deleteState.error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteState.isLoading}
                  className="px-4 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(job.jobId)}
                  disabled={deleteState.isLoading}
                  className="px-4 py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {deleteState.isLoading ? (
                    <Activity className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleteState.isLoading ? "Deleting..." : "Yes, Delete Job"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Components (Contained in single file) ---

function StatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded text-xs font-mono glow-primary flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> COMPLETED
        </span>
      );
    case "FAILED":
      return (
        <span className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded text-xs font-mono glow-danger flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> FAILED
        </span>
      );
    case "PROCESSING":
    case "UPLOADED":
      return (
        <span className="bg-info/10 text-info border border-info/20 px-2 py-1 rounded text-xs font-mono glow-info flex items-center gap-1">
          <Activity className="w-3 h-3 animate-pulse" /> PROCESSING
        </span>
      );
    default:
      return (
        <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-mono">
          UNKNOWN
        </span>
      );
  }
}

function Stepper({ currentStage }: { currentStage?: string }) {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage || "UPLOADED");

  return (
    <div className="flex flex-col gap-2">
      {PIPELINE_STAGES.map((stage, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <div
            key={stage}
            className={`flex items-center gap-3 p-2 rounded transition-colors ${isActive ? "bg-muted/50 border border-border" : ""}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${isCompleted ? "bg-primary" : isActive ? "bg-info glow-info animate-pulse" : "bg-muted-foreground/30"}`}
            />
            <span
              className={`font-mono text-sm ${isCompleted ? "text-foreground" : isActive ? "text-info font-bold" : "text-muted-foreground"}`}
            >
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border p-5 rounded-lg flex items-start gap-4 hover:border-muted-foreground/30 transition-colors">
      <div className="p-2 bg-background rounded-md border border-border">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-xl font-mono text-foreground">{value}</p>
      </div>
    </div>
  );
}
