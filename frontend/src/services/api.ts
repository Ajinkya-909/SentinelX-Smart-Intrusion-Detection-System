/**
 * API Service Base Configuration
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * POST request for FormData (File Uploads)
   * We bypass the default request() method here because we MUST NOT set the
   * Content-Type header manually. The browser needs to set it automatically
   * to include the multipart boundary.
   */
  public async postForm<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem("authToken");

    const headers: HeadersInit = {
      ...options?.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        method: "POST",
        headers, // Notice: No Content-Type defined
        body: formData,
        credentials: "include",
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "File upload failed");
      }

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during upload";
      throw new Error(errorMessage);
    }
  }

  /**
   * Make HTTP request with automatic token handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    // Get token from localStorage
    const token = localStorage.getItem("authToken");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Include cookies for HTTP-only token
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      throw new Error(errorMessage);
    }
  }

  /**
   * GET request
   */
  public get<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request
   */
  public post<T>(
    endpoint: string,
    body?: Record<string, any>,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  public put<T>(
    endpoint: string,
    body?: Record<string, any>,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  public delete<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

export default new ApiService();
