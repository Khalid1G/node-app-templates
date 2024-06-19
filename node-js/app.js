const express = require("express");
//const { isAuth } = require("./middlewares/auth_middleware"); // Import the isAuth middleware
const limiter = require("./middlewares/rate_limiter");

const {
  unhandledRoutes,
  globalErrorHandler,
} = require("./middlewares/errors_middleware");

const app = express();
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const { join } = require("path");
const morgan = require("morgan");
const fs = require("fs");
const compression = require("compression");

// Create a write stream (in append mode) for the access log file
const accessLogStream = fs.createWriteStream(join(__dirname, "access.log"), {
  flags: "a",
});

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      //user field
      "fname",
      "lname",
      "email",
      "role",

      //order field
    ],
  })
);

// Configure the Express app

/**
 * Trust proxy: ensures that Express correctly handles the client's IP address even when the app is behind a proxy or load balancer.
 */
app.enable("trust proxy"); // Enable trust for the proxy in front of the app
app.use(compression()); // Enable response compression using the compression middleware
app.use(morgan("combined", { stream: accessLogStream })); // Use Morgan middleware to log requests
app.use(helmet()); //set security HTTP headers
app.use(express.static("public")); // Serve static files from the "public" directory
app.use(express.json({ limit: "10kb" })); // Parse JSON request bodies with a size limit of 10kb

app.use(mongoSanitize()); //Date sanitization against NoSQL query injection
app.use(xss()); //Data sanitization against XSS
app.use(cors());
app.set("view engine", "pug"); //set pug engine

if (process.env.NODE_ENV === "production") {
  //Limiting request form same IP
  app.use("/api", limiter);
}

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the API of the <app name>",
    env: process.env.NODE_ENV,
  });
});

app.all("*", unhandledRoutes); // Handle all unhandled routes with the unhandledRoutes middleware
app.use(globalErrorHandler); // Use the globalErrorHandler middleware to handle errors globally

module.exports = app; // Export the Express app for external use
