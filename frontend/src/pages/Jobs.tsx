import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Upload, Trash2, RotateCcw, ArrowRight, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import jobService from "@/services/job";
import { Job, JobListResponse } from "@/types/job";

const ROWS_PER_PAGE = 10;

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch jobs from API
  const fetchJobs = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * ROWS_PER_PAGE;

      const response: JobListResponse = await jobService.listJobs({
        limit: ROWS_PER_PAGE,
        offset,
      });

      setJobs(response.jobs);
      setTotalJobs(response.pagination.total);
      setCurrentPage(page);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch jobs";
      setError(errorMessage);
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refetch when page changes
  useEffect(() => {
    fetchJobs(currentPage);
  }, [currentPage]);

  // Filter jobs based on search query
  const filteredJobs = jobs.filter((job) =>
    (job.fileName || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(totalJobs / ROWS_PER_PAGE);

  // Status badge styling
  const getStatusColor = (
    status: Job["status"],
  ): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "COMPLETED":
        return "default"; // Will be styled green
      case "PROCESSING":
        return "outline"; // Will be styled cyan
      case "FAILED":
        return "destructive"; // Will be styled red
      case "UPLOADED":
        return "secondary"; // Will be styled gray
      default:
        return "default";
    }
  };

  const getStatusText = (status: Job["status"]): string => {
    switch (status) {
      case "PROCESSING":
        return "● Processing";
      case "COMPLETED":
        return "● Completed";
      case "FAILED":
        return "● Failed";
      case "UPLOADED":
        return "● Queued";
      default:
        return status;
    }
  };

  // Handle row click to navigate to job details
  const handleRowClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  // Handle delete job
  const handleDelete = async (
    jobId: string,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.stopPropagation();

    try {
      setActionLoading(jobId);
      await jobService.deleteJob(jobId);
      setJobs(jobs.filter((job) => job.jobId !== jobId));
      setTotalJobs(Math.max(0, totalJobs - 1));
      toast({
        title: "Job Deleted",
        description: "The job has been deleted successfully.",
      });
    } catch (err) {
      console.error("Error deleting job:", err);
      toast({
        title: "Error",
        description: "Failed to delete job.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle retry job
  const handleRetry = async (
    jobId: string,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.stopPropagation();
    try {
      setActionLoading(jobId);
      const updatedJob = await jobService.retryJob(jobId);
      setJobs(jobs.map((job) => (job.jobId === jobId ? updatedJob : job)));
      toast({
        title: "Analysis Restarted",
        description: "The job has been queued for analysis.",
      });
    } catch (err) {
      console.error("Error retrying job:", err);
      toast({
        title: "Error",
        description: "Failed to retry job.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    console.log(bytes)
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date to readable format
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
console.log(filteredJobs)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">All Jobs</h1>
          <p className="text-sm text-gray-400 mt-1">
            Reviewing {totalJobs} active and historical log processing tasks.
          </p>
        </div>
        <Button
          onClick={() => navigate("/jobs/upload")}
          className="bg-primary hover:bg-primary/60 text-black font-semibold gap-2"
        >
          <Upload size={18} />
          Upload New Log
        </Button>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-500" size={18} />
        <Input
          placeholder="Filter by filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#1E1E1E] border-gray-700 text-white placeholder-gray-500 focus:border-yellow-400"
        />
      </div>

      {/* Error State */}
      {error && (
        <Alert className="bg-red-900/20 border-red-800">
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-800 bg-[#121212] overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-[#1E1E1E]">
            <TableRow className="border-gray-800 hover:bg-[#1E1E1E]">
              <TableHead className="text-gray-400 font-semibold w-1/6">
                JOB ID
              </TableHead>
              <TableHead className="text-gray-400 font-semibold w-1/6">
                JOB NAME
              </TableHead>
              <TableHead className="text-gray-400 font-semibold w-1/6">
                SIZE
              </TableHead>
              <TableHead className="text-gray-400 font-semibold w-1/6">
                CREATED AT
              </TableHead>
              <TableHead className="text-gray-400 font-semibold w-1/6">
                STATUS
              </TableHead>
              <TableHead className="text-gray-400 font-semibold w-1/6">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: ROWS_PER_PAGE }).map((_, i) => (
                <TableRow key={i} className="border-gray-800">
                  <TableCell className="w-1/6">
                    <Skeleton className="h-4 w-24 bg-gray-700" />
                  </TableCell>
                  <TableCell className="w-1/6">
                    <Skeleton className="h-4 w-32 bg-gray-700" />
                  </TableCell>
                  <TableCell className="w-1/6">
                    <Skeleton className="h-4 w-16 bg-gray-700" />
                  </TableCell>
                  <TableCell className="w-1/6">
                    <Skeleton className="h-4 w-28 bg-gray-700" />
                  </TableCell>
                  <TableCell className="w-1/6">
                    <Skeleton className="h-6 w-20 bg-gray-700" />
                  </TableCell>
                  <TableCell className="w-1/6">
                    <Skeleton className="h-8 w-20 bg-gray-700" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredJobs.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-gray-500">
                    {searchQuery
                      ? "No jobs match your search."
                      : "No jobs found. Start by uploading a log file."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job, index) => (
                <TableRow
                  key={job.jobId || `job-${index}`}
                  onClick={() => handleRowClick(job.jobId)}
                  className="border-gray-800 hover:bg-[#1E1E1E] cursor-pointer transition-colors"
                >
                  <TableCell className="text-gray-300 font-mono text-sm w-1/6">
                    #{(job.jobId || "").slice(0, 6)}
                  </TableCell>
                  <TableCell className="text-white truncate max-w-xs w-1/6">
                    {job.jobName}
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm w-1/6">
                    {job.fileSize ? formatFileSize(Number(job.fileSize)) : "—"}
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm w-1/6">
                    {formatDate(job.createdAt)}
                  </TableCell>
                  <TableCell className="w-1/6">
                    <Badge
                      variant={getStatusColor(job.status)}
                      className={`
                        font-semibold text-xs
                        ${
                          job.status === "COMPLETED"
                            ? "bg-green-900/30 text-green-400 border-green-700"
                            : job.status === "PROCESSING"
                              ? "bg-cyan-900/30 text-cyan-400 border-cyan-700"
                              : job.status === "FAILED"
                                ? "bg-red-900/30 text-red-400 border-red-700"
                                : "bg-gray-700/30 text-gray-400 border-gray-600"
                        }
                      `}
                    >
                      {getStatusText(job.status)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="flex gap-2 justify-center items-center w-1/6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {job.status === "FAILED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleRetry(job.jobId, e)}
                        disabled={actionLoading === job.jobId}
                        className="text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300"
                        title="Retry analysis"
                      >
                        <RotateCcw size={16} />
                      </Button>
                    )}
                    {job.status === "COMPLETED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/jobs/${job.jobId}`);
                        }}
                        className="text-cyan-400 hover:bg-cyan-900/20 hover:text-cyan-300"
                        title="View details"
                      >
                        <ArrowRight size={16} />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          disabled={actionLoading === job.jobId}
                          className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                          title="Delete job"
                        >
                          {actionLoading === job.jobId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-gray-800 bg-[#121212] text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete job log?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete this job? This action cannot be undone and will permanently delete the log file and all ML analysis results.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-gray-800 bg-[#1E1E1E] text-white hover:bg-gray-800 hover:text-white">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => handleDelete(job.jobId, e)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, totalJobs)}{" "}
            to {Math.min(currentPage * ROWS_PER_PAGE, totalJobs)} of {totalJobs}{" "}
            jobs
          </p>
          <Pagination>
            <PaginationContent className="gap-1">
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="cursor-pointer hover:bg-gray-800"
                  />
                </PaginationItem>
              )}

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className={`cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-yellow-400 text-black"
                          : "hover:bg-gray-800"
                      }`}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="cursor-pointer hover:bg-gray-800"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default Jobs;
