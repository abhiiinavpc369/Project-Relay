const express = require("express");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

async function isMember(conversationId, userId) {
  const row = await prisma.conversationMember.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    select: { id: true },
  });

  return Boolean(row);
}

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: req.user.id },
      include: {
        conversation: {
          include: {
            members: { include: { user: { select: { id: true, username: true, email: true } } } },
            messages: {
              include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    const conversations = memberships.map((m) => ({
      id: m.conversation.id,
      name: m.conversation.name,
      isGroup: m.conversation.isGroup,
      members: m.conversation.members.map((member) => member.user),
      lastMessage: m.conversation.messages[0] || null,
      updatedAt: m.conversation.updatedAt,
    }));

    return res.json({ conversations });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/conversations/direct", authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId === req.user.id) {
      return res.status(400).json({ error: "Invalid target user" });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true },
    });

    if (!target) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const candidates = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        members: { some: { userId: req.user.id } },
      },
      include: { members: { select: { userId: true } } },
    });

    let conversation = candidates.find((c) => {
      if (c.members.length !== 2) return false;
      const ids = c.members.map((m) => m.userId);
      return ids.includes(req.user.id) && ids.includes(targetUserId);
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          members: { create: [{ userId: req.user.id }, { userId: targetUserId }] },
        },
      });
    }

    return res.status(201).json({ conversation });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.post("/conversations/room", authMiddleware, async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;
    const uniqueMembers = [...new Set([req.user.id, ...memberIds])];

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Room name is required" });
    }

    const room = await prisma.conversation.create({
      data: {
        name: name.trim().slice(0, 60),
        isGroup: true,
        members: { create: uniqueMembers.map((userId) => ({ userId })) },
      },
    });

    return res.status(201).json({ conversation: room });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to create room" });
  }
});

router.post("/conversations/:conversationId/invite", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { targetUserId } = req.body;

    const member = await isMember(conversationId, req.user.id);
    if (!member) return res.status(403).json({ error: "Forbidden" });

    const exists = await prisma.conversationMember.findUnique({
      where: { userId_conversationId: { userId: targetUserId, conversationId } },
      select: { id: true },
    });

    if (!exists) {
      await prisma.conversationMember.create({ data: { userId: targetUserId, conversationId } });
    }

    return res.json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to invite user" });
  }
});

router.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const canRead = await isMember(conversationId, req.user.id);

    if (!canRead) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return res.json({ messages });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = "text", meta = null } = req.body;

    if (!(await isMember(conversationId, req.user.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Message content required" });
    }

    const message = await prisma.message.create({
      data: {
        content: String(content),
        type,
        meta,
        senderId: req.user.id,
        conversationId,
      },
      include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return res.status(201).json({ message });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
