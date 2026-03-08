const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "project-relay-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

module.exports = app;