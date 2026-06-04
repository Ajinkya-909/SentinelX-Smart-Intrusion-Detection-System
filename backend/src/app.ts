import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:5173",
      "http://localhost:8080",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//  import the routes
import authRoutes from "./routes/auth.routes";
import jobRoutes from "./routes/job.routes";
import dashboardRoutes from "./routes/dashboard.routes";

app.use("/auth", authRoutes);
app.use("/jobs", jobRoutes);
app.use("/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to SentinelX");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Server is live",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  });
});

export default app;
