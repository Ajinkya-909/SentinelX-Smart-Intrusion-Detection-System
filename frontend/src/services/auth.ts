/**
 * Authentication API Service
 * Handles all auth-related API requests
 */

import api, { ApiResponse } from "./api";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  current_password?: string;
  new_password?: string;
}

class AuthService {
  /**
   * User Sign Up
   * POST /auth/sign-up
   */
  async signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    return api.post<AuthResponse>("/auth/sign-up", data);
  }

  /**
   * User Login
   * POST /auth/login
   */
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return api.post<AuthResponse>("/auth/login", data);
  }

  /**
   * Get Current User
   * GET /auth/me
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return api.get<User>("/auth/me");
  }

  /**
   * Update User Profile
   * PUT /auth/update/:userId
   */
  async updateUser(
    userId: string,
    data: UpdateUserRequest,
  ): Promise<ApiResponse<User>> {
    return api.put<User>(`/auth/update/${userId}`, data);
  }

  /**
   * Delete User Account
   * DELETE /auth/delete/:userId
   */
  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<{ message: string }>(`/auth/delete/${userId}`);
  }

  /**
   * Logout
   * POST /auth/logout
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return api.post<{ message: string }>("/auth/logout");
  }

  /**
   * Store token in localStorage
   */
  setAuthToken(token: string): void {
    localStorage.setItem("authToken", token);
  }

  /**
   * Get token from localStorage
   */
  getAuthToken(): string | null {
    return localStorage.getItem("authToken");
  }

  /**
   * Clear token from localStorage
   */
  clearAuthToken(): void {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }

  /**
   * Store user in localStorage
   */
  setUser(user: User): void {
    localStorage.setItem("user", JSON.stringify(user));
  }

  /**
   * Get user from localStorage
   */
  getUser(): User | null {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

export default new AuthService();
