const prisma = require("../lib/prisma");
const { verifyToken } = require("../lib/jwt");

function createSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, name: true, email: true, avatarUrl: true },
      });

      if (!user) return next(new Error("Unauthorized"));

      socket.user = user;
      return next();
    } catch (_error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("session:ready", { user: socket.user });

    socket.on("conversation:join", async ({ conversationId }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { userId_conversationId: { userId: socket.user.id, conversationId } },
        select: { id: true },
      });

      if (!membership) {
        socket.emit("error:message", { message: "Forbidden" });
        return;
      }

      socket.join(`conversation:${conversationId}`);
      socket.emit("conversation:joined", { conversationId });
    });

    socket.on("message:send", async ({ conversationId, content, type = "text", meta = null }) => {
      const safe = (content || "").toString().trim();
      if (!safe) {
        socket.emit("error:message", { message: "Message is empty" });
        return;
      }

      const membership = await prisma.conversationMember.findUnique({
        where: { userId_conversationId: { userId: socket.user.id, conversationId } },
        select: { id: true },
      });

      if (!membership) {
        socket.emit("error:message", { message: "Forbidden" });
        return;
      }

      const message = await prisma.message.create({
        data: { content: safe, type, meta, senderId: socket.user.id, conversationId },
        include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
      });

      await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      io.to(`conversation:${conversationId}`).emit("message:new", message);
    });
  });
}

module.exports = createSocketHandlers;
