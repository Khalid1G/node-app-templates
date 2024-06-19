require("dotenv").config();

const app = require("./app");
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");

const port = process.env.PORT || 8000;
const URI = process.env.MONGODB_URI;

// if (!URI) {
//   console.log("MONGODB_URI is not defined");
//   process.exit();
// }

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

// mongoose.set("strictQuery", true);
// mongoose
//   .connect(URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   }).then(() => {
//     console.log("MongoDB connected");
//     require("./seeder/firstUser").createSuperAdmin();

//     server.listen(port, () => console.log(`Server running on port ${port}`));
//   }).catch((err) => {
//     console.log("MongoDB connection error: ", err);
//     process.exit();
//   });

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("Process terminated!");
  });
});
