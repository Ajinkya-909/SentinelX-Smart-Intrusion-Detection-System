import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Activity, Trash2, RotateCcw, Loader, Loader2 } from "lucide-react";
import { useFetchJobDetail, useJobActions } from "@/hooks";
import { Job } from "@/types/job";

// Sub-components
import JobProcessing from "@/components/JobProcessing";
import JobCompleted from "@/components/JobCompleted";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Hooks for Fetching & Actions
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

  // --- Early Returns for Loading & Error States ---
  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-muted-foreground gap-4 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-mono text-sm tracking-widest uppercase">Initializing Secure Connection...</p>
      </div>
    );
  }

  if (fetchError || !job) {
    return (
      <div className="container max-w-5xl py-12 animate-fade-in">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 flex flex-col items-start gap-4">
          <div className="flex items-center gap-2 text-destructive font-bold text-lg">
            <AlertTriangle className="w-6 h-6" />
            Failed to load job data
          </div>
          {fetchError && (
            <p className="text-sm text-destructive/80 font-mono bg-background p-4 rounded border border-destructive/20 w-full">
              {fetchError}
            </p>
          )}
          <button 
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-background border border-border text-foreground hover:bg-muted transition-colors font-mono text-xs uppercase tracking-wider"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = job.status;

  return (
    <div className="container max-w-7xl py-8">
      {/* STATE A: PROCESSING & UPLOADED
        Delegated to JobProcessing component 
      */}
      {(currentStatus === "UPLOADED" || currentStatus === "PROCESSING") && (
        <JobProcessing job={job} isPolling={isPolling} />
      )}

      {/* STATE B: COMPLETED
        Delegated to JobCompleted component 
      */}
      {currentStatus === "COMPLETED" && (
        <JobCompleted 
          job={job} 
          actions={{
            handleReanalyze: () => handleReanalyze(job.jobId),
            handleDownload: () => handleDownload(job.jobId, job.fileName),
            handleReport: () => navigate(`/jobs/${id}/report`),
            handleDeleteClick: () => setShowDeleteModal(true)
          }}
          states={{
            isReanalyzing: reanalyzeState.isLoading,
            isDownloading: downloadState.isLoading,
            isAnyLoading: isAnyLoading
          }}
        />
      )}

      {/* STATE C: FAILED
        Handled natively within the controller for quick retry access
      */}
      {currentStatus === "FAILED" && (
        <div className="space-y-6 animate-fade-in">
          <header className="border-b border-border pb-6">
            <h1 className="text-3xl font-sans font-semibold text-foreground mb-2">Job Execution Failed</h1>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">ID: {job.jobId}</p>
          </header>
          
          <div className="bg-destructive/10 border border-destructive rounded-lg p-8">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-bold">Pipeline Error</h2>
            </div>
            
            <p className="text-destructive/90 font-mono text-sm bg-background p-4 rounded border border-destructive/20 mb-6">
              {job.errorMessage || "Unknown error encountered during processing."}
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleRetry(job.jobId)}
                disabled={retryState.isLoading || isAnyLoading}
                className="flex items-center gap-2 bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-md transition-colors font-mono font-bold uppercase tracking-wider text-xs"
              >
                {retryState.isLoading ? <Activity className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {retryState.isLoading ? "Retrying..." : "Force Retry Analysis"}
              </button>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={isAnyLoading}
                className="flex items-center gap-2 bg-background border border-border text-foreground hover:text-destructive hover:border-destructive/50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-md transition-colors font-mono uppercase tracking-wider text-xs"
              >
                <Trash2 className="w-4 h-4" /> Discard Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Global Delete Confirmation Modal --- */}
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
              className="bg-card border border-destructive/30 p-8 rounded-lg shadow-2xl max-w-lg w-full"
            >
              <h3 className="text-xl font-bold text-destructive mb-3 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" /> Confirm Permanent Deletion
              </h3>
              
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                You are about to delete <span className="font-mono text-foreground">{job.fileName}</span>. 
                This will cascade delete all findings, AI insights, normalized logs, and the physical file from storage. 
                <strong className="text-foreground block mt-2">This action cannot be undone.</strong>
              </p>

              {deleteState.error && (
                <p className="text-destructive/80 font-mono text-xs bg-background p-3 rounded border border-destructive/20 mb-6">
                  {deleteState.error}
                </p>
              )}

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteState.isLoading}
                  className="px-6 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-xs uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(job.jobId)}
                  disabled={deleteState.isLoading}
                  className="px-6 py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider"
                >
                  {deleteState.isLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleteState.isLoading ? "Purging..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}