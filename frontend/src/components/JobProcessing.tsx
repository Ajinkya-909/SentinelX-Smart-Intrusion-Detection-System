import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, Search, Database, Cpu, Lightbulb, Activity } from "lucide-react";
import { Job } from "@/types/job";

const PIPELINE_STAGES = [
  { id: "UPLOADED", label: "UPLOAD", icon: UploadCloud },
  { id: "PREPROCESSED", label: "PREPROCESS", icon: FileText },
  { id: "TYPE_DETECTED", label: "DETECT", icon: Search },
  { id: "PARSED", label: "PARSE", icon: FileText },
  { id: "NORMALIZED", label: "NORMALIZE", icon: Database },
  { id: "ANALYZED", label: "ANALYZE", icon: Cpu },
  { id: "INSIGHTS_GENERATED", label: "INSIGHTS", icon: Lightbulb },
];

// Authentic log mappings based on your backend and ML orchestrator logs
const STAGE_LOGS: Record<string, string[]> = {
  UPLOADED: [
    "[INFO] Allocating memory for raw log ingestion...",
    "[INFO] Verifying file integrity and checksum..."
  ],
  PREPROCESSED: [
    "[INFO] Cleaning whitespace and empty lines...",
    "[INFO] Detecting file encoding...",
    "[INFO] Sanitizing log structure..."
  ],
  TYPE_DETECTED: [
    "[INFO] Analyzing line patterns for format detection...",
    "[INFO] Calculating confidence scores across parsers...",
    "[INFO] Determining optimal parser strategy..."
  ],
  PARSED: [
    "[INFO] Extracting structured fields using detected parser...",
    "[INFO] Mapping timestamps, IPs, and severity levels...",
    "[INFO] Parsing complete. Proceeding to normalization..."
  ],
  NORMALIZED: [
    "[INFO] Standardizing timestamps to ISO8601...",
    "[INFO] Unifying field mappings...",
    "[INFO] Bulk inserting to normalized_logs table..."
  ],
  ANALYZED: [
    "[INFO] Executing Rule, Statistical, Temporal, and Correlation analyzers...",
    "[INFO] Extracting behavioral features...",
    "[INFO] Sending vectors to ML service...",
    "[INFO] Scaling features with StandardScaler...",
    "[INFO] Running Isolation Forest & DBSCAN...",
    "[INFO] ML analysis complete. Converting results to findings..."
  ],
  INSIGHTS_GENERATED: [
    "[INFO] Generating deterministic insights (ACTIVITY_TIMELINE, SEVERITY_DISTRIBUTION)...",
    "[INFO] Building AI context with normalized logs and findings...",
    "[INFO] Gemini API is available - proceeding with LLM insight generation...",
    "[INFO] Generating OVERVIEW, THREAT_SUMMARY, and RECOMMENDATION...",
    "[INFO] Persisting all insights..."
  ],
  COMPLETED: [
    "[INFO] Job marked complete.",
    "[INFO] Finalizing database transaction..."
  ]
};

interface JobProcessingProps {
  job: Job;
  isPolling: boolean;
}

export default function JobProcessing({ job, isPolling }: JobProcessingProps) {
  // Use progress from the hook response, fallback to 0
  const currentProgress = job.progress ?? 0;
  
  // Use lastCompletedStage (or currentStage if passed that way in the extended Job type)
  // Ensure it defaults to UPLOADED
  const currentStage = (job as any).currentStage || job.lastCompletedStage || "UPLOADED";
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toISOString().split('T')[1].slice(0,-1)}] [SYSTEM] Initializing SentinelX Analysis Engine...`
  ]);

  useEffect(() => {
    // Generate realistic logs based on the current active stage
    const possibleLogs = STAGE_LOGS[currentStage as keyof typeof STAGE_LOGS] || STAGE_LOGS.UPLOADED;
    const randomLog = possibleLogs[Math.floor(Math.random() * possibleLogs.length)];
    
    setLogs(prev => {
      const newLogs = [...prev];
      if (newLogs.length > 5) newLogs.shift();
      newLogs.push(`[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${randomLog}`);
      return newLogs;
    });
  }, [currentStage, currentProgress]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Visualizer */}
      <div className="flex justify-center py-8">
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 border border-primary/20 bg-background/50 flex flex-col items-center justify-center">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
          
          {/* Scanning line animation */}
          <motion.div 
            className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_10px_rgba(132,204,22,0.8)]"
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, ease: "linear", repeat: Infinity }}
          />

          <h2 className="text-4xl sm:text-5xl font-mono font-bold text-foreground">
            {currentProgress}%
          </h2>
          <p className="text-[10px] sm:text-xs font-mono tracking-[0.3em] text-muted-foreground mt-2 uppercase">
            Processing
          </p>
        </div>
      </div>

      {/* Responsive Stepper Container */}
      <div className="bg-card border border-border p-6 sm:p-8 relative overflow-x-auto rounded-md">
        <div className="flex justify-between items-center relative z-10 min-w-max px-4">
          {PIPELINE_STAGES.map((stage, idx) => {
            // Treat stages before current as completed
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            const Icon = stage.icon;

            return (
              <div key={stage.id} className="flex flex-col items-center gap-3 relative z-10 w-20 sm:w-24">
                <div className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded flex items-center justify-center border transition-all duration-300
                  ${isActive ? 'bg-primary/20 border-primary text-primary glow-primary scale-110' : 
                    isCompleted ? 'bg-muted border-primary/40 text-foreground' : 
                    'bg-background border-border text-muted-foreground'}
                `}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`font-mono text-[9px] sm:text-[10px] text-center uppercase tracking-wider ${isActive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
          
          {/* Background Connecting Line */}
          <div className="absolute top-5 sm:top-6 left-12 right-12 h-[2px] bg-border -z-10" />
          
          {/* Active Connecting Line */}
          <div 
            className="absolute top-5 sm:top-6 left-12 h-[2px] bg-primary glow-primary -z-10 transition-all duration-500" 
            style={{ 
              width: currentIndex <= 0 
                ? '0%' 
                : `calc(${(currentIndex / (PIPELINE_STAGES.length - 1)) * 100}% - 48px)` 
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-md">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-mono">Progress Indicator</p>
          <div className="flex items-end gap-4">
            <span className="text-2xl font-mono text-primary">{currentProgress.toFixed(2)}%</span>
          </div>
          <div className="h-1 w-full bg-background mt-3 rounded-full overflow-hidden border border-border">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${currentProgress}%` }} />
          </div>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-md">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-mono">Current Stage</p>
          <span className="text-sm sm:text-lg font-mono text-primary flex items-center gap-2 truncate">
            <Activity className="w-4 h-4 animate-pulse shrink-0" />
            {currentStage.replace(/_/g, " ")}
          </span>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-md sm:col-span-2 md:col-span-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-mono">Last Updated</p>
          <span className="text-lg font-mono text-foreground truncate block">
            {job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Simulated Terminal Stream */}
      <div className="bg-[#050505] border border-border rounded-sm p-4 font-mono text-xs shadow-inner">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
          <span className="text-muted-foreground uppercase tracking-wider text-[10px]">System_Logs_Stream</span>
          <span className={`text-[9px] uppercase ml-2 ${isPolling ? 'text-primary' : 'text-muted-foreground'}`}>
            Auto-Refresh: {isPolling ? 'ON' : 'OFF'}
          </span>
          <div className="ml-auto flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive"></div>
            <div className="w-2 h-2 rounded-full bg-medium"></div>
            <div className="w-2 h-2 rounded-full bg-primary"></div>
          </div>
        </div>
        <div className="space-y-1.5 text-muted-foreground h-40 overflow-hidden flex flex-col justify-end">
          {logs.map((log, i) => (
            <div key={i} className={`truncate ${i === logs.length - 1 ? 'text-primary drop-shadow-[0_0_2px_rgba(132,204,22,0.8)]' : ''}`}>
              {log}
            </div>
          ))}
          <div className="flex items-center text-primary mt-1">
            <span>_</span><span className="animate-pulse block w-2 h-3.5 bg-primary ml-1"></span>
          </div>
        </div>
      </div>
    </div>
  );
}