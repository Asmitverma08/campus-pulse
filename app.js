/**
 * @fileoverview Express application configuration with security, compression, and routing.
 */

require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const { eventsRouter } = require("./routes/events.routes");

const app = express();

// Security headers with helmet configured for CDN-based Tailwind and safe scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Response compression for optimal network efficiency
app.use(compression());

// Strict JSON body parsing with 10kb limit to prevent payload-based denial of service
app.use(express.json({ limit: "10kb" }));

// Serve static frontend assets from /public
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api", eventsRouter);

// Fallback to index.html for client-side routing
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Central generic error handler to prevent leaking sensitive tracebacks to client
app.use((err, _req, res, _next) => {
  console.error("[Unhandled App Error]:", err);
  res.status(err.status || 500).json({
    error: "An unexpected server error occurred. Please try again later.",
  });
});

module.exports = app;

