class ApiResponse {
  statusCode: number;
  data: JSON;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: JSON, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
