const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const { signToken } = require("../lib/jwt");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password || password.length < 6) {
      return res.status(400).json({ error: "Invalid registration payload" });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: email.toLowerCase() }] },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, name: name || username, email: email.toLowerCase(), passwordHash },
      select: { id: true, username: true, name: true, email: true, bio: true, avatarUrl: true },
    });

    return res.status(201).json({ token: signToken(user.id), user });
  } catch (_error) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Invalid login payload" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.json({
      token: signToken(user.id),
      user: { id: user.id, username: user.username, name: user.name, email: user.email, bio: user.bio, avatarUrl: user.avatarUrl },
    });
  } catch (_error) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, username, bio, avatarUrl } = req.body;

    const taken = username
      ? await prisma.user.findFirst({
          where: { OR: [{ username }] },
          select: { id: true },
        })
      : null;

    if (taken && taken.id !== req.user.id) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(typeof name === "string" ? { name: name.trim().slice(0, 60) } : {}),
        ...(typeof username === "string" ? { username: username.trim().slice(0, 30) } : {}),
        ...(typeof bio === "string" ? { bio: bio.trim().slice(0, 180) } : {}),
        ...(typeof avatarUrl === "string" ? { avatarUrl } : {}),
      },
      select: { id: true, username: true, name: true, email: true, bio: true, avatarUrl: true },
    });

    return res.json({ user: updated });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

router.put("/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Invalid password payload" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    return res.json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to update password" });
  }
});

module.exports = router;
