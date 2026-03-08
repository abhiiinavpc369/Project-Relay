const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const { signToken } = require("../lib/jwt");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

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
      data: { username, email: email.toLowerCase(), passwordHash },
      select: { id: true, username: true, email: true },
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
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (_error) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;