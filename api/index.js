const express = require("express");
const cors = require("cors");
const os = require("os");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const standardInstrumentsRoutes = require("./src/routes/standardInstrumentRoutes");
const customerRoutes = require("./src/routes/customerRoutes");
const methodRoutes = require("./src/routes/methodRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes (we'll add these next)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/standard-instruments", standardInstrumentsRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/methods", methodRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: 200, message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    status: err.status || 500,
    error: true,
    message: err.message || "Server error",
  });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Listen on all interfaces
const LOCAL_IP = getLocalIP();
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${LOCAL_IP}:${PORT}`);
});
