import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import router from "./router/index.js";
import { errorHandler } from "./shared/errors/error-handler.js";

const app = express();

/**
 * ================================
 * Security Middleware
 * ================================
 */

// Security headers
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


/**
 * ================================
 * Request Logging
 * ================================
 */

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/**
 * ================================
 * Body Parsers
 * ================================
 */

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

app.use(cookieParser());
app.use(
  "/uploads",
  express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    },
  })
);

/**
 * ================================
 * Global Rate Limit
 * ================================
 */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use(limiter);

/**
 * ================================
 * Routes
 * ================================
 */

app.use("/api", router);

/**
 * ================================
 * 404 Handler
 * ================================
 */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

/**
 * ================================
 * Global Error Handler
 * ================================
 */

app.use(errorHandler);

export default app;