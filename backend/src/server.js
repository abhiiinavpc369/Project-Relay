const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const prisma = require("./lib/prisma");
const createSocketHandlers = require("./socket");

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.frontendUrl, credentials: true } });

app.set("io", io);
createSocketHandlers(io);

server.listen(env.port, () => {
  console.log(`Project Relay backend running on port ${env.port}`);
});

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);