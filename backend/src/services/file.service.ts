import fs from "fs";
import path from "path";
import { ApiError } from "@/utils/api-error";
import { jobRepository } from "@/repositories/job.repository";

const fileService = {
  async saveFile(file: Express.Multer.File) {
    if (!file) {
      throw new ApiError(400, "No file provided");
    }

    if (!file.path || !file.filename) {
      throw new ApiError(400, "Invalid file: missing path or filename");
    }

    if (!fs.existsSync(file.path)) {
      throw new ApiError(500, "File was not saved properly to disk");
    }

    if (file.size === 0) {
      throw new ApiError(
        400,
        "File is empty. Please upload a file with content",
      );
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
    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, `File not found: ${filePath}`);
    }

    try {
      fs.unlinkSync(filePath);
    } catch (error: any) {
      throw new ApiError(500, `Failed to delete file: ${error.message}`);
    }
  },

  async moveFile(oldPath: string, newPath: string): Promise<string> {
    if (!fs.existsSync(oldPath)) {
      throw new ApiError(404, `Source file not found: ${oldPath}`);
    }

    try {
      const newDir = path.dirname(newPath);

      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }

      fs.renameSync(oldPath, newPath);
      return newPath;
    } catch (error: any) {
      throw new ApiError(500, `Failed to move file: ${error.message}`);
    }
  },

  async fileExists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath);
  },

  async readFile(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, `File not found: ${filePath}`);
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return content;
    } catch (error: any) {
      throw new ApiError(500, `Failed to read file: ${error.message}`);
    }
  },

  async getFileSize(filePath: string): Promise<number> {
    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, `File not found: ${filePath}`);
    }

    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error: any) {
      throw new ApiError(500, `Failed to get file size: ${error.message}`);
    }
  },
};

export { fileService };
