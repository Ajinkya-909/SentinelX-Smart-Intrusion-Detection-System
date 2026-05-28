import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Upload, X, FileText, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import jobService from "@/services/job";

// --- Validation Constants & Config ---
const ALLOWED_EXTENSIONS = [".log", ".txt", ".json", ".csv"];
const ALLOWED_MIME_TYPES = [
  "text/plain", // .log, .txt
  "application/json", // .json
  "text/csv", // .csv
];

// Fallback to 80MB if environment variable is not defined
const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB) || 80;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function JobUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States matching user entry criteria
  const [jobName, setJobName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // React Query mutation processing upload pipeline trigger
  const { mutate: uploadPayload, isPending } = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Payload file is mandatory.");
      return await jobService.uploadJob(selectedFile, jobName || undefined);
    },
    onSuccess: (data) => {
      toast.success("Payload accepted into system pipeline.");
      // Immediate routing redirect to tracking dynamic view
      navigate(`/jobs/${data.jobId}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Pipeline initialization sequence failed.");
    },
  });

  // Drag and Drop handlers matching tactical aesthetic states
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Strictly grab only the first file if multiple are dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    // 1. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        `Payload size exceeds maximum allowed boundary (${MAX_FILE_SIZE_MB}MB).`
      );
      return;
    }

    // 2. Validate File Extension
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      toast.error(
        `Invalid payload format. Supported extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      return;
    }

    // 3. Optional: Validate MIME Type (Soft check, as OS interpretation varies for .log files)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type) && fileExtension !== ".log") {
      console.warn(`Unexpected MIME type: ${file.type} for extension ${fileExtension}`);
    }

    // If passed, set file and replace any previously selected file
    setSelectedFile(file);

    // Auto-fill run configuration identifier context if name is empty
    if (!jobName) {
      const cleanName = file.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      setJobName(`SEC_AUDIT_${cleanName.slice(0, 15)}`);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +
      " " +
      ["B", "KB", "MB", "GB"][i]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("No inspection source file configured.");
      return;
    }
    uploadPayload();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono animate-fade-in text-left">
      {/* View Header section mirroring image layout */}
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-wider uppercase flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary" /> UPLOAD_JOB_GATEWAY
        </h1>
        <p className="text-xs text-muted-foreground tracking-widest mt-1 uppercase">
          Awaiting local payload for deep-packet inspection
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Component block matching identity interface input fields */}
        <div className="rounded-lg border border-border bg-secondary p-6 space-y-3">
          <label className="text-xs font-bold tracking-wider text-primary uppercase">
            JOB_IDENTIFIER
          </label>
          <Input
            type="text"
            placeholder="Enter Analysis Name (e.g. SEC_AUDIT_2026_Q2)"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            disabled={isPending}
            className="bg-[#1E1E1E] border-border text-foreground tracking-wide font-mono focus:ring-1 focus:ring-primary h-12"
          />
        </div>

        {/* Drop zone configuration element tracking file handles */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isPending && fileInputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[260px] ${
            isDragging
              ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(84,255,0,0.15)]"
              : "border-border bg-secondary hover:border-muted-foreground/50 hover:bg-[#1E1E1E]"
          }`}
        >
          {/* Note: omitted the 'multiple' attribute to enforce single file selection natively */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ALLOWED_EXTENSIONS.join(",")}
            className="hidden"
            disabled={isPending}
          />

          <Upload
            className={`w-12 h-12 mb-4 transition-transform duration-200 ${
              isDragging ? "scale-110 text-primary" : "text-primary"
            }`}
          />
          <h3 className="text-lg font-bold tracking-wide uppercase text-foreground">
            DRAG_DROP_PAYLOAD
          </h3>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
            SUPPORTED_EXT: {ALLOWED_EXTENSIONS.join(", ").toUpperCase()} (MAX {MAX_FILE_SIZE_MB}MB)
          </p>
        </div>

        {/* Visual attachment tracking row component layout */}
        {selectedFile && (
          <div className="rounded-lg border border-border bg-secondary p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-md bg-[#1E1E1E] border border-border text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground tracking-wide">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 uppercase">
                  {formatBytes(selectedFile.size)} | MIME:{" "}
                  {selectedFile.type || "text/plain"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={removeFile}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Trigger deployment execution interface buttons block */}
        <div className="flex items-center justify-end pt-4 border-t border-border/30">
          <Button
            type="submit"
            disabled={!selectedFile || isPending}
            className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold tracking-widest uppercase px-8 h-12 min-w-[160px] border border-transparent shadow-md font-mono text-xs rounded-sm transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                LOADING...
              </>
            ) : (
              "INIT_SCAN"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}