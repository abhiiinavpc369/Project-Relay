const dotenv = require("dotenv");

dotenv.config();

const requiredKeys = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL"];

for (const key of requiredKeys) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL,
  jwtSecret: process.env.JWT_SECRET,
};