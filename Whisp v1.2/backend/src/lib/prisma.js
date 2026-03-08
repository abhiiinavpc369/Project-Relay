const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STORE_DIR = path.join(__dirname, "..", "..", "data");
const STORE_FILE = path.join(STORE_DIR, "store.json");

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(
      STORE_FILE,
      JSON.stringify({ users: [], conversations: [], conversationMembers: [], messages: [], statuses: [] }, null, 2)
    );
  }
}

function loadStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
}

function saveStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

let store = loadStore();

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID().replace(/-/g, "");
}

function selectFields(record, select) {
  if (!record) return null;
  if (!select) return { ...record };
  const out = {};
  for (const key of Object.keys(select)) {
    if (select[key]) out[key] = record[key];
  }
  return out;
}

function caseContains(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}

const prisma = {
  user: {
    async findUnique({ where, select } = {}) {
      const user = store.users.find((u) => {
        if (where?.id) return u.id === where.id;
        if (where?.email) return u.email === where.email;
        return false;
      });
      if (!user) return null;
      return selectFields(user, select);
    },

    async findFirst({ where, select } = {}) {
      const user = store.users.find((u) => {
        if (where?.OR?.length) {
          return where.OR.some((rule) => {
            if (rule.username) return u.username === rule.username;
            if (rule.email) return u.email === rule.email;
            return false;
          });
        }
        return false;
      });

      if (!user) return null;
      return selectFields(user, select);
    },

    async findMany({ where, select, orderBy, take } = {}) {
      let users = [...store.users];

      if (where?.id?.not) {
        users = users.filter((u) => u.id !== where.id.not);
      }

      if (where?.OR?.length) {
        users = users.filter((u) =>
          where.OR.some((rule) => {
            if (rule.username?.contains) return caseContains(u.username, rule.username.contains);
            if (rule.email?.contains) return caseContains(u.email, rule.email.contains);
            return false;
          })
        );
      }

      if (orderBy?.username === "asc") {
        users.sort((a, b) => a.username.localeCompare(b.username));
      }

      if (take) users = users.slice(0, take);

      return users.map((u) => selectFields(u, select));
    },

    async create({ data, select } = {}) {
      const created = {
        id: id(),
        username: data.username,
        name: data.name || data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        bio: data.bio || "",
        avatarUrl: data.avatarUrl || "",
        createdAt: now(),
        updatedAt: now(),
      };
      store.users.push(created);
      saveStore(store);
      return selectFields(created, select);
    },

    async update({ where, data, select } = {}) {
      const user = store.users.find((u) => u.id === where?.id);
      if (!user) return null;
      Object.assign(user, data, { updatedAt: now() });
      saveStore(store);
      return selectFields(user, select);
    },
  },

  conversationMember: {
    async findUnique({ where, select } = {}) {
      const key = where?.userId_conversationId;
      if (!key) return null;
      const row = store.conversationMembers.find(
        (m) => m.userId === key.userId && m.conversationId === key.conversationId
      );
      if (!row) return null;
      return selectFields(row, select);
    },

    async findMany({ where, include, orderBy } = {}) {
      let rows = [...store.conversationMembers];
      if (where?.userId) rows = rows.filter((m) => m.userId === where.userId);

      if (orderBy?.conversation?.updatedAt === "desc") {
        rows.sort((a, b) => {
          const ca = store.conversations.find((c) => c.id === a.conversationId);
          const cb = store.conversations.find((c) => c.id === b.conversationId);
          return new Date(cb?.updatedAt || 0) - new Date(ca?.updatedAt || 0);
        });
      }

      if (!include?.conversation) return rows;

      return rows.map((m) => {
        const conversation = store.conversations.find((c) => c.id === m.conversationId);
        const out = { ...m, conversation: { ...conversation } };

        if (include.conversation.include?.members) {
          const members = store.conversationMembers
            .filter((cm) => cm.conversationId === conversation.id)
            .map((cm) => {
              if (include.conversation.include.members.include?.user) {
                const user = store.users.find((u) => u.id === cm.userId);
                return { ...cm, user: selectFields(user, include.conversation.include.members.include.user.select) };
              }
              return cm;
            });
          out.conversation.members = members;
        }

        if (include.conversation.include?.messages) {
          let messages = store.messages.filter((msg) => msg.conversationId === conversation.id);
          if (include.conversation.include.messages.orderBy?.createdAt === "desc") {
            messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
          if (include.conversation.include.messages.take) {
            messages = messages.slice(0, include.conversation.include.messages.take);
          }
          if (include.conversation.include.messages.include?.sender) {
            messages = messages.map((msg) => {
              const sender = store.users.find((u) => u.id === msg.senderId);
              return {
                ...msg,
                sender: selectFields(sender, include.conversation.include.messages.include.sender.select),
              };
            });
          }
          out.conversation.messages = messages;
        }

        return out;
      });
    },

    async create({ data, select } = {}) {
      const created = {
        id: id(),
        userId: data.userId,
        conversationId: data.conversationId,
        joinedAt: now(),
      };
      store.conversationMembers.push(created);
      saveStore(store);
      return selectFields(created, select);
    },
  },

  conversation: {
    async findMany({ where, include } = {}) {
      let rows = [...store.conversations];

      if (typeof where?.isGroup === "boolean") {
        rows = rows.filter((c) => c.isGroup === where.isGroup);
      }

      if (where?.members?.some?.userId) {
        const uid = where.members.some.userId;
        rows = rows.filter((c) =>
          store.conversationMembers.some((cm) => cm.conversationId === c.id && cm.userId === uid)
        );
      }

      if (!include?.members) return rows;

      return rows.map((c) => {
        const members = store.conversationMembers
          .filter((cm) => cm.conversationId === c.id)
          .map((cm) => selectFields(cm, include.members.select));
        return { ...c, members };
      });
    },

    async create({ data } = {}) {
      const convo = {
        id: id(),
        name: data.name || null,
        isGroup: Boolean(data.isGroup),
        createdAt: now(),
        updatedAt: now(),
      };
      store.conversations.push(convo);

      const members = data?.members?.create || [];
      for (const member of members) {
        store.conversationMembers.push({
          id: id(),
          userId: member.userId,
          conversationId: convo.id,
          joinedAt: now(),
        });
      }

      saveStore(store);
      return convo;
    },

    async update({ where, data }) {
      const row = store.conversations.find((c) => c.id === where.id);
      if (!row) return null;
      Object.assign(row, data, { updatedAt: now() });
      saveStore(store);
      return row;
    },
  },

  message: {
    async findMany({ where, include, orderBy, take } = {}) {
      let rows = [...store.messages];
      if (where?.conversationId) rows = rows.filter((m) => m.conversationId === where.conversationId);

      if (orderBy?.createdAt === "asc") {
        rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }

      if (take) rows = rows.slice(0, take);

      if (include?.sender?.select) {
        rows = rows.map((m) => {
          const sender = store.users.find((u) => u.id === m.senderId);
          return { ...m, sender: selectFields(sender, include.sender.select) };
        });
      }

      return rows;
    },

    async create({ data, include } = {}) {
      const created = {
        id: id(),
        content: data.content,
        senderId: data.senderId,
        conversationId: data.conversationId,
        type: data.type || "text",
        meta: data.meta || null,
        createdAt: now(),
      };
      store.messages.push(created);
      saveStore(store);

      if (include?.sender?.select) {
        const sender = store.users.find((u) => u.id === created.senderId);
        return { ...created, sender: selectFields(sender, include.sender.select) };
      }

      return created;
    },
  },

  async $disconnect() {
    return;
  },
};

module.exports = prisma;
