import { promises as fs } from "fs";
import path from "path";
import { createReadStream } from "fs";
import { ApiError } from "@/utils/api-error";
import { jobRepository } from "@/repositories/job.repository";
import { UPLOAD_ERRORS } from "@/constants/upload.constants";

const fileService = {
  async checkFile(file: Express.Multer.File) {
    if (!file) {
      throw new ApiError(400, UPLOAD_ERRORS.NO_FILE);
    }

    return {
      path: file.path,
      filename: file.filename,
      size: file.size,
      originalName: file.originalname,
    };
  },

  async getFilePath(jobId: string): Promise<string> {
    const job = await jobRepository.getJobById(jobId);

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    return job.file_path;
  },

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (error: any) {
      throw new ApiError(404, UPLOAD_ERRORS.FILE_DELETE_ERROR);
    }
  },

  async moveFile(oldPath: string, newPath: string): Promise<string> {
    try {
      const newDir = path.dirname(newPath);
      await fs.mkdir(newDir, { recursive: true });
      await fs.rename(oldPath, newPath);
      return newPath;
    } catch (error: any) {
      throw new ApiError(500, UPLOAD_ERRORS.FILE_MOVE_ERROR);
    }
  },

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },

  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    } catch (error: any) {
      throw new ApiError(500, UPLOAD_ERRORS.FILE_READ_ERROR);
    }
  },

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error: any) {
      throw new ApiError(500, "Failed to get file size");
    }
  },

  async downloadFile(filePath: string): Promise<NodeJS.ReadableStream> {
    try {
      // Check if file exists
      const exists = await this.fileExists(filePath);
      if (!exists) {
        throw new ApiError(404, "File not found");
      }

      // Return read stream for file download
      const stream = createReadStream(filePath);
      return stream;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to download file");
    }
  },
};

export { fileService };
