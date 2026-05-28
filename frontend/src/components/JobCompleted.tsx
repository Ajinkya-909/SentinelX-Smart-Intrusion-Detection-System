import React from "react";
import { Download, RotateCcw, FileText, CheckCircle, Trash2 } from "lucide-react";
import { Job } from "@/types/job";

// Helper for formatting dates safely
function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return "Invalid Date";
  }
}

interface JobCompletedProps {
  job: Job;
  actions: {
    handleReanalyze: (id: string) => void;
    handleDownload: (id: string, fileName: string) => void;
    handleReport: () => void;
    handleDeleteClick: () => void;
  };
  states: {
    isReanalyzing: boolean;
    isDownloading: boolean;
    isAnyLoading: boolean;
  };
}

export default function JobCompleted({ job, actions, states }: JobCompletedProps) {
  // Calculate process time from timestamps since normalization_time_ms is not in DetectionResult
  let processTimeStr = "N/A";
  if (job.createdAt && job.updatedAt) {
    const start = new Date(job.createdAt).getTime();
    const end = new Date(job.updatedAt).getTime();
    if (!isNaN(start) && !isNaN(end)) {
      processTimeStr = `${((end - start) / 1000).toFixed(2)}s`;
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-border pb-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-1">
            JOBS {'>'} {job.jobId?.split('-')[0].toUpperCase() || "UNKNOWN"}
          </p>
          <h1 className="text-3xl font-sans font-semibold text-foreground">
            Job Analysis Controller
          </h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => actions.handleDownload(job.jobId, job.fileName)}
            disabled={states.isDownloading || states.isAnyLoading}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-xs font-mono hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Download Raw File
          </button>
          <button 
            onClick={() => actions.handleReanalyze(job.jobId)}
            disabled={states.isReanalyzing || states.isAnyLoading}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-xs font-mono hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${states.isReanalyzing ? 'animate-spin' : ''}`} /> Reanalyze Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Grid */}
          <div className="bg-card border border-border p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="col-span-2 md:col-span-4 flex justify-between items-start border-b border-border pb-4 mb-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-1">Status Indicator</p>
                <div className="flex items-center gap-2 text-primary font-mono text-xl font-bold">
                  <div className="w-3 h-3 rounded-full bg-primary glow-primary"></div>
                  COMPLETED
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-1">Severity Rating</p>
                <div className="border border-primary text-primary px-3 py-1 text-xs font-mono">
                  {job.outcome === 'SUCCESS' ? 'CLEAN' : 'WARNING'}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Job ID</p>
              <p className="text-sm font-mono text-foreground truncate">#{job.jobId?.split('-')[0].toUpperCase()}-PROD</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">File Name</p>
              <p className="text-sm font-mono text-foreground truncate">{job.fileName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Job Name</p>
              <p className="text-sm font-mono text-foreground truncate">{job.jobName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">File Size</p>
              <p className="text-sm font-mono text-foreground">{job.fileSize ? `${(job.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</p>
            </div>
            
            <div className="space-y-1 col-span-2 md:col-span-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Analysis Duration</p>
              <p className="text-sm font-mono text-foreground">{processTimeStr}</p>
            </div>
            <div className="space-y-1 col-span-2 md:col-span-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Completed At</p>
              <p className="text-sm font-mono text-foreground">{formatDate(job.updatedAt)}</p>
            </div>
          </div>

          {/* System Execution Logs (Mapped from Processing Metadata) */}
          <div className="bg-[#050505] border border-border md:block hidden">
            <div className="flex justify-between items-center p-3 border-b border-border bg-card">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">System_Execution_Logs</p>
              <p className="text-[10px] text-muted-foreground uppercase font-mono">Auto-Refresh: OFF</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="pb-2 font-normal">TIMESTAMP</th>
                    <th className="pb-2 font-normal">EVENT_TYPE</th>
                    <th className="pb-2 font-normal">SOURCE</th>
                    <th className="pb-2 font-normal">MESSAGE</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr className="border-b border-border/20">
                    <td className="py-3">{formatDate(job.createdAt).split(' ')[1]}</td>
                    <td className="py-3 text-primary">INITIALIZE</td>
                    <td className="py-3">CORE_KERNEL</td>
                    <td className="py-3">Allocating memory for {job.fileName}</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3">{formatDate(job.createdAt).split(' ')[1]}</td>
                    <td className="py-3 text-primary">DETECTION</td>
                    <td className="py-3">TYPE_ANALYZER</td>
                    <td className="py-3">Detected type: {job.processingMetadata?.detectedType || 'UNKNOWN'} ({((job.processingMetadata?.confidence || 0) * 100).toFixed(0)}% conf)</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3">{formatDate(job.createdAt).split(' ')[1]}</td>
                    <td className="py-3 text-primary">PARSING</td>
                    <td className="py-3">LOG_INTERPRETER</td>
                    <td className="py-3">Used {job.processingMetadata?.parser || 'generic'} parser. Enc: {job.processingMetadata?.encoding}</td>
                  </tr>
                  <tr>
                    <td className="py-3">{formatDate(job.updatedAt).split(' ')[1]}</td>
                    <td className="py-3 text-primary">VALIDATION</td>
                    <td className="py-3">NORM_ENGINE</td>
                    <td className="py-3">Normalized detected entities successfully based on matched patterns.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: CTA Report Card */}
        <div>
          <div className="bg-card border border-border p-4 md:p-8 h-full hidden md:flex flex-col justify-center text-center">
            <div className="w-16 h-16 mx-auto bg-primary/10 flex items-center justify-center rounded-lg border border-primary/20 mb-6 glow-primary">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-sans font-bold text-foreground mb-4">
              Final Report Ready
            </h2>
            <p className="text-sm text-muted-foreground mb-8 px-4">
              The automated deep-scan has concluded. Review the actionable insights, extracted entities, and pattern analysis detected in the source file.
            </p>
            <button 
              onClick={actions.handleReport}
              disabled={states.isAnyLoading}
              className="w-full bg-primary text-primary-foreground font-mono font-bold uppercase tracking-wider py-4 rounded hover:opacity-90 transition-opacity glow-primary"
            >
              Access Security Report
            </button>
          </div>
            <button 
              onClick={actions.handleReport}
              disabled={states.isAnyLoading}
              className="block md:hidden w-full bg-primary text-primary-foreground font-mono font-bold uppercase tracking-wider py-4 rounded hover:opacity-90 transition-opacity glow-primary"
            >
              Access Security Report
            </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[1px] bg-border flex-1"></div>
          <span className="text-[10px] text-destructive uppercase tracking-widest font-mono font-bold">Danger Zone</span>
          <div className="h-[1px] bg-border flex-1"></div>
        </div>
        <div className="border border-destructive/30 rounded p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-background">
          <div>
            <h4 className="text-foreground font-bold mb-1">Delete Job Permanently</h4>
            <p className="text-sm text-muted-foreground">This will immediately remove all associated analysis logs, metadata, and the raw source file from the SentinelX secure enclave. This action cannot be undone.</p>
          </div>
          <button 
            onClick={actions.handleDeleteClick}
            disabled={states.isAnyLoading}
            className="shrink-0 flex items-center gap-2 border border-destructive text-destructive px-6 py-2 hover:bg-destructive/10 transition-colors font-mono uppercase tracking-wider text-xs"
          >
            <Trash2 className="w-4 h-4" /> Delete Job
          </button>
        </div>
      </div>
    </div>
  );
}