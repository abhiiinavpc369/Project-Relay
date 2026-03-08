const prisma = require("../lib/prisma");
const { verifyToken } = require("../lib/jwt");

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = header.slice(7);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = authMiddleware;