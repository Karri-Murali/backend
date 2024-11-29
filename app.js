const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const placesRoutes = require("./routes/places-routes");
const userRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const path = require("path");
const app = express();

// Define CORS options for stricter handling
const corsOptions = {
  origin: [
    "http://localhost:5173", // For local development
    "https://tourism-frontend-l0pnxaqav-karri-muralis-projects.vercel.app" // Your frontend URL on Vercel
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies and credentials
  optionsSuccessStatus: 200, // Some older browsers may fail without this
};

// Use CORS middleware with the options
app.use(cors(corsOptions));

// Handle pre-flight requests (OPTIONS method) globally
app.options("*", cors(corsOptions));

app.use(bodyParser.json());

// Serve static images for file uploads
app.use("/uploads/images", express.static(path.join(__dirname, "uploads", "images")));

// Routes for API
app.use("/api/places", placesRoutes);
app.use("/api/users", userRoutes);

// Handle 404 for invalid API routes
app.use((req, res, next) => {
  const error = new HttpError("Could not find this page", 404);
  next(error);
});

// Global error handling middleware
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  if (res.headersSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

// MongoDB connection setup
const username = encodeURIComponent(process.env.DB_USER);
const password = encodeURIComponent(process.env.DB_PASSWORD);

mongoose
  .connect(
    `mongodb+srv://${username}:${password}@cluster0.cvd8r.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Connection error", err);
  });
