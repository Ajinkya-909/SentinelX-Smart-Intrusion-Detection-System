/**
 * Jobs Page
 * Log upload and job management interface
 */

import { useState } from "react";
import { Upload, FileText, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function Jobs() {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);

  const mockJobs = [
    {
      id: "job-001",
      fileName: "auth_logs_2024.log",
      fileSize: "42.5 MB",
      status: "COMPLETED",
      uploadedAt: "2024-01-24 14:52:11",
      threats: 12,
    },
    {
      id: "job-002",
      fileName: "system_events.log",
      fileSize: "128.3 MB",
      status: "PROCESSING",
      uploadedAt: "Today at 10:30 AM",
      threats: null,
    },
    {
      id: "job-003",
      fileName: "network_traffic.pcap",
      fileSize: "256.1 MB",
      status: "QUEUED",
      uploadedAt: "Today at 9:15 AM",
      threats: null,
    },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      toast({
        title: "Success",
        description: `Uploaded ${files.length} file(s). Processing started.`,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Logs</h1>
        <p className="text-muted-foreground mt-2">
          Upload log files for intelligent threat analysis and detection
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed transition-all p-12 text-center cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/5"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Drag and drop your logs here
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              or click to select files (supports .log, .txt, .json)
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2">
            <FileText className="w-4 h-4 mr-2" />
            Choose Files
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-foreground">Your Jobs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and view your analysis jobs
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Threats
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {mockJobs.map((job) => (
                <tr key={job.id} className="hover:bg-card/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">
                      {job.fileName}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">
                      {job.fileSize}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        job.status === "COMPLETED"
                          ? "bg-green-500/20 text-green-500"
                          : job.status === "PROCESSING"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-blue-500/20 text-blue-500"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">
                      {job.threats !== null ? (
                        <span
                          className={
                            job.threats > 0
                              ? "text-destructive"
                              : "text-green-500"
                          }
                        >
                          {job.threats}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">
                      {job.uploadedAt}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {job.status === "COMPLETED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Jobs;
