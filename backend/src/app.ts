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
    origin: process.env.CORS_ORIGIN?.split(",") || "http://locahost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//  import the routes
import authRoutes from "./routes/auth.routes";
import jobRoutes from "./routes/job.routes";

app.use("/auth", authRoutes);
app.use("/jobs", jobRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to SentinelX");
});

export default app;
