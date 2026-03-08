"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { connectSocket } from "../lib/socket";
import FloatingAuthForm from "../components/auth/FloatingAuthForm";

const TOKEN_KEY = "project-relay-token";
const ONBOARDING_PENDING_KEY = "relay:onboarding-pending";

const THEME_OPTIONS = [
  { id: "relay", label: "Relay Green" },
  { id: "blueprint", label: "Blueprint Blue" },
  { id: "sunburst", label: "Sunburst Yellow" },
];

const UI_OPTIONS = [
  { id: "rounded", label: "Curved" },
  { id: "pointy", label: "Pointy" },
  { id: "glass", label: "Glassmorphism" },
];

const DENSITY_OPTIONS = [
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" },
];

const BUBBLE_OPTIONS = [
  { id: "solid", label: "Solid" },
  { id: "outline", label: "Outline" },
];

const DEFAULT_PREFS = {
  theme: "relay",
  uiStyle: "rounded",
  density: "comfortable",
  bubbleStyle: "solid",
  effects: true,
};

function roomName(room, currentUserId) {
  if (!room) return "";
  if (room.isGroup && room.name) return room.name;
  const peer = room.members?.find((m) => m.id !== currentUserId);
  return peer?.username || "Direct Chat";
}

function getPrefKey(userId) {
  return `relay:pref:${userId}`;
}

function applyUiPreferences(prefs) {
  if (typeof document === "undefined") return;
  const p = { ...DEFAULT_PREFS, ...(prefs || {}) };
  document.body.setAttribute("data-theme", p.theme);
  document.body.setAttribute("data-ui", p.uiStyle);
  document.body.setAttribute("data-density", p.density);
  document.body.setAttribute("data-bubble", p.bubbleStyle);
  document.body.setAttribute("data-effects", p.effects ? "on" : "off");
}

function OnboardingPreview({ prefs }) {
  return (
    <div className={`onboard-preview preview-theme-${prefs.theme} preview-ui-${prefs.uiStyle}`}>
      <div className="onboard-preview-header">
        <span className="dot" />
        <span className="line" />
      </div>
      <div className="onboard-preview-card">
        <p className="title">Your Style Preview</p>
        <p className="meta">Theme + shape + bubble mood</p>
        <div className="chips">
          <span>{prefs.theme}</span>
          <span>{prefs.uiStyle}</span>
          <span>{prefs.bubbleStyle}</span>
        </div>
      </div>
      <div className="onboard-preview-chat">
        <div className="bubble left">Welcome to Project Relay</div>
        <div className="bubble right">Looks perfect. Let&apos;s start.</div>
      </div>
    </div>
  );
}

function SettingsPanel({ preferences, onChange, user, reopenOnboarding }) {
  return (
    <section className="panel settings-panel flex min-h-[80vh] flex-col rounded-2xl p-5 sm:p-6">
      <div className="mb-5 border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[#3299ff]">Settings</p>
        <h3 className="text-xl font-semibold">Personalize Workspace</h3>
        <p className="mt-1 text-sm text-slate-300">Adjust visuals and behavior for {user?.username}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="setting-card">
          <p className="setting-title">Theme</p>
          <div className="setting-row">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`onboarding-choice ${preferences.theme === opt.id ? "is-active" : ""}`}
                onClick={() => onChange({ theme: opt.id })}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-card">
          <p className="setting-title">UI Shape</p>
          <div className="setting-row">
            {UI_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`onboarding-choice ${preferences.uiStyle === opt.id ? "is-active" : ""}`}
                onClick={() => onChange({ uiStyle: opt.id })}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-card">
          <p className="setting-title">Density</p>
          <div className="setting-row">
            {DENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`onboarding-choice ${preferences.density === opt.id ? "is-active" : ""}`}
                onClick={() => onChange({ density: opt.id })}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-card">
          <p className="setting-title">Message Bubble</p>
          <div className="setting-row">
            {BUBBLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`onboarding-choice ${preferences.bubbleStyle === opt.id ? "is-active" : ""}`}
                onClick={() => onChange({ bubbleStyle: opt.id })}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="setting-card mt-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="setting-title">Visual Effects</p>
            <p className="text-xs text-slate-400">Turn animated accents on/off.</p>
          </div>
          <button
            type="button"
            className={`toggle ${preferences.effects ? "is-on" : ""}`}
            onClick={() => onChange({ effects: !preferences.effects })}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="setting-card mt-4">
        <p className="setting-title">Preview</p>
        <OnboardingPreview prefs={preferences} />
      </div>

      <div className="mt-auto pt-4">
        <button className="btn btn-blue" onClick={reopenOnboarding} type="button">Run Onboarding Again</button>
      </div>
    </section>
  );
}

function ChatWorkspace({ activeRoom, messages, draft, setDraft, sendMessage, activeRoomId, user }) {
  return (
    <section className="panel flex min-h-[80vh] flex-col rounded-2xl">
      <header className="border-b border-white/10 px-4 py-4 sm:px-5">
        <p className="text-xs uppercase tracking-[0.15em] text-[#3299ff]">Active Room</p>
        <h3 className="text-lg font-semibold sm:text-xl">{activeRoom ? roomName(activeRoom, user?.id) : "Select a conversation"}</h3>
      </header>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-4 sm:px-5">
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
                {!mine && <p className="mb-1 text-xs text-[#ffd447]">{m.sender?.username || "User"}</p>}
                <p className="text-sm">{m.content}</p>
              </div>
            </div>
          );
        })}
        {!messages.length && <p className="text-sm text-slate-400">No messages yet.</p>}
      </div>

      <form className="border-t border-white/10 p-4" onSubmit={sendMessage}>
        <div className="flex gap-2">
          <input
            className="input"
            disabled={!activeRoomId}
            placeholder={activeRoomId ? "Type a message..." : "Choose a conversation"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn btn-green" disabled={!activeRoomId} type="submit">Send</button>
        </div>
      </form>
    </section>
  );
}

function ChatShell({
  user,
  rooms,
  activeRoomId,
  setActiveRoomId,
  messages,
  draft,
  setDraft,
  sendMessage,
  search,
  setSearch,
  searchResults,
  searchUsers,
  createDirect,
  logout,
  activeSection,
  setActiveSection,
  preferences,
  onPreferencesChange,
  reopenOnboarding,
}) {
  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId), [rooms, activeRoomId]);

  return (
    <main className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 gap-3 p-3 md:gap-4 md:p-4 lg:grid-cols-[220px_320px_1fr]">
      <aside className="panel flex flex-col rounded-2xl p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#35d07f]">Project Relay</p>
          <h2 className="mt-2 text-lg font-semibold">{user?.username}</h2>
          <p className="text-xs text-slate-400">Live collaboration chat</p>
        </div>

        <nav className="mt-6 grid gap-2 text-sm">
          <button
            type="button"
            onClick={() => setActiveSection("messages")}
            className={`nav-item ${activeSection === "messages" ? "is-active" : ""}`}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("friends")}
            className={`nav-item ${activeSection === "friends" ? "is-active" : ""}`}
          >
            Friends
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("settings")}
            className={`nav-item ${activeSection === "settings" ? "is-active" : ""}`}
          >
            Settings
          </button>
        </nav>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-300">
          <p>Conversations: {rooms.length}</p>
          <p className="mt-1">Realtime: Connected</p>
        </div>

        <div className="mt-auto pt-4">
          <button className="btn w-full bg-[#0d1217] text-sm text-slate-100" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </aside>

      <aside className={`panel rounded-2xl p-4 ${activeSection === "settings" ? "opacity-60" : ""}`}>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{activeSection === "friends" ? "Friends" : "Find Friends"}</p>
        </div>

        <div className="mb-4 space-y-2">
          <input className="input" placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-blue w-full" onClick={searchUsers} type="button">Find</button>
          <div className="max-h-36 space-y-2 overflow-auto">
            {searchResults.map((u) => (
              <button
                key={u.id}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-sm hover:border-[#35d07f]"
                onClick={() => createDirect(u.id)}
                type="button"
              >
                {u.username}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-2 text-xs uppercase tracking-[0.17em] text-slate-400">Conversations</p>
        <div className="max-h-[56vh] space-y-2 overflow-auto pr-1">
          {rooms.map((room) => (
            <button
              key={room.id}
              className={`w-full rounded-xl border px-3 py-3 text-left ${room.id === activeRoomId ? "border-[#ffd447] bg-[#11171d]" : "border-white/10 bg-[#0d1217]/70 hover:border-[#3299ff]"}`}
              onClick={() => {
                setActiveSection("messages");
                setActiveRoomId(room.id);
              }}
              type="button"
            >
              <p className="font-medium">{roomName(room, user?.id)}</p>
              <p className="truncate text-xs text-slate-400">{room.lastMessage?.content || "No messages"}</p>
            </button>
          ))}
          {!rooms.length && <p className="text-sm text-slate-400">Search users to start chatting.</p>}
        </div>
      </aside>

      {activeSection === "settings" ? (
        <SettingsPanel
          preferences={preferences}
          onChange={onPreferencesChange}
          user={user}
          reopenOnboarding={reopenOnboarding}
        />
      ) : (
        <ChatWorkspace
          activeRoom={activeRoom}
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          sendMessage={sendMessage}
          activeRoomId={activeRoomId}
          user={user}
        />
      )}
    </main>
  );
}

function OnboardingOverlay({ token, user, onComplete, createDirect }) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function findFriends() {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoadingFriends(true);
    setError("");
    try {
      const data = await api(`/api/users?search=${encodeURIComponent(query)}`, {}, token);
      setResults(data.users || []);
    } catch (e) {
      setError(e.message || "Failed to find users");
    } finally {
      setLoadingFriends(false);
    }
  }

  function toggleFriend(userId) {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function finishOnboarding() {
    setSaving(true);
    setError("");
    try {
      const prefKey = getPrefKey(user.id);
      window.localStorage.setItem(prefKey, JSON.stringify(prefs));
      applyUiPreferences(prefs);

      for (const friendId of selectedFriendIds) {
        await createDirect(friendId);
      }

      window.localStorage.removeItem(ONBOARDING_PENDING_KEY);
      onComplete(prefs);
    } catch (e) {
      setError(e.message || "Failed to finish onboarding");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <section className="panel onboarding-box w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[#ffd447]">Onboarding</p>
        <h2 className="mt-2 text-2xl font-semibold">Welcome, {user.username}</h2>

        {step === 0 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Your account is ready. Let&apos;s personalize Project Relay in a few quick steps.</p>
            <button className="login-glow-btn" onClick={() => setStep(1)} type="button">Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Choose a color theme.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, theme: item.id }))}
                  className={`onboarding-choice ${prefs.theme === item.id ? "is-active" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <OnboardingPreview prefs={prefs} />
            <div className="flex justify-end">
              <button className="btn btn-blue" onClick={() => setStep(2)} type="button">Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Pick your interface style.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {UI_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, uiStyle: item.id }))}
                  className={`onboarding-choice ${prefs.uiStyle === item.id ? "is-active" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <OnboardingPreview prefs={prefs} />
            <div className="flex justify-between">
              <button className="btn bg-[#0d1217] text-slate-200" onClick={() => setStep(1)} type="button">Back</button>
              <button className="btn btn-blue" onClick={() => setStep(3)} type="button">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Add a few friends to start chatting.</p>
            <div className="flex gap-2">
              <input
                className="floating-input"
                placeholder="Search users"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="btn btn-blue" onClick={findFriends} type="button">
                {loadingFriends ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="max-h-40 space-y-2 overflow-auto">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleFriend(u.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedFriendIds.includes(u.id)
                      ? "border-[#35d07f] bg-[#10231a]"
                      : "border-white/10 bg-black/30"
                  }`}
                >
                  {u.username}
                </button>
              ))}
              {!results.length && <p className="text-xs text-slate-400">No users loaded yet. Search by name or email.</p>}
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <div className="flex items-center justify-between">
              <button className="btn bg-[#0d1217] text-slate-200" onClick={() => setStep(2)} type="button">Back</button>
              <button className="login-glow-btn w-auto px-5" onClick={finishOnboarding} disabled={saving} type="button">
                {saving ? "Finishing..." : "Finish Setup"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AuthExperience({
  mode,
  setMode,
  username,
  setUsername,
  email,
  setEmail,
  password,
  setPassword,
  authError,
  authLoading,
  submitAuth,
  setPasswordFocused,
}) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="auth-bg absolute inset-0" />
      <div className="auth-glow auth-glow-green" />
      <div className="auth-glow auth-glow-blue" />
      <div className="auth-float auth-float-1" />
      <div className="auth-float auth-float-2" />
      <div className="auth-float auth-float-3" />
      <div className="auth-ring auth-ring-1" />
      <div className="auth-ring auth-ring-2" />
      <div className="auth-orbital">
        <div className="auth-orbital-core" />
      </div>

      <FloatingAuthForm
        mode={mode}
        setMode={setMode}
        username={username}
        setUsername={setUsername}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authError={authError}
        authLoading={authLoading}
        onSubmit={submitAuth}
        onPasswordFocus={() => setPasswordFocused(true)}
        onPasswordBlur={() => setPasswordFocused(false)}
      />
    </main>
  );
}

export default function HomePage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("messages");
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);

  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [socket, setSocket] = useState(null);

  function updatePreferences(patch) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    applyUiPreferences(next);
    if (user?.id) {
      window.localStorage.setItem(getPrefKey(user.id), JSON.stringify(next));
    }
  }

  useEffect(() => {
    applyUiPreferences(DEFAULT_PREFS);
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setRooms([]);
      setMessages([]);
      setActiveRoomId("");
      setOnboardingOpen(false);
      return;
    }

    let canceled = false;

    async function loadData() {
      try {
        const [me, conversations] = await Promise.all([
          api("/api/auth/me", {}, token),
          api("/api/chat/conversations", {}, token),
        ]);

        if (canceled) return;

        setUser(me.user);
        setRooms(conversations.conversations || []);
        if (conversations.conversations?.length) {
          setActiveRoomId(conversations.conversations[0].id);
        }

        const prefKey = getPrefKey(me.user.id);
        const rawPref = window.localStorage.getItem(prefKey);
        if (rawPref) {
          const pref = { ...DEFAULT_PREFS, ...JSON.parse(rawPref) };
          setPreferences(pref);
          applyUiPreferences(pref);
        } else {
          setPreferences(DEFAULT_PREFS);
          applyUiPreferences(DEFAULT_PREFS);
        }

        const pending = window.localStorage.getItem(ONBOARDING_PENDING_KEY) === "1";
        if (pending || !rawPref) {
          setOnboardingOpen(true);
        }
      } catch (_error) {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken("");
      }
    }

    loadData();
    return () => {
      canceled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const client = connectSocket(token);
    setSocket(client);

    client.on("message:new", (message) => {
      setRooms((prev) => {
        const updated = prev.map((room) =>
          room.id === message.conversationId
            ? { ...room, lastMessage: message, updatedAt: new Date().toISOString() }
            : room
        );
        return [...updated].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });

      if (message.conversationId === activeRoomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    return () => {
      client.disconnect();
      setSocket(null);
    };
  }, [token, activeRoomId]);

  useEffect(() => {
    if (!activeRoomId || !token) return;

    async function loadMessages() {
      try {
        const data = await api(`/api/chat/conversations/${activeRoomId}/messages`, {}, token);
        setMessages(data.messages || []);
        socket?.emit("conversation:join", { conversationId: activeRoomId });
      } catch (_error) {
        setMessages([]);
      }
    }

    loadMessages();
  }, [activeRoomId, token, socket]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { username, email, password };
      const data = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });

      if (mode === "register") {
        window.localStorage.setItem(ONBOARDING_PENDING_KEY, "1");
      }

      window.localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
      setPasswordFocused(false);
    } catch (error) {
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  async function searchUsers() {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const data = await api(`/api/users?search=${encodeURIComponent(search)}`, {}, token);
      setSearchResults(data.users || []);
    } catch (_error) {
      setSearchResults([]);
    }
  }

  async function createDirect(targetUserId) {
    try {
      const data = await api(
        "/api/chat/conversations/direct",
        { method: "POST", body: JSON.stringify({ targetUserId }) },
        token
      );

      const list = await api("/api/chat/conversations", {}, token);
      setRooms(list.conversations || []);
      setActiveRoomId(data.conversation.id);
      setSearchResults([]);
      setSearch("");
      return data;
    } catch (_error) {
      return null;
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeRoomId || !socket) return;

    socket.emit("message:send", { conversationId: activeRoomId, content: text });
    setDraft("");
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ONBOARDING_PENDING_KEY);
    setToken("");
  }

  if (!token) {
    return (
      <AuthExperience
        mode={mode}
        setMode={setMode}
        username={username}
        setUsername={setUsername}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authError={authError}
        authLoading={authLoading}
        submitAuth={submitAuth}
        passwordFocused={passwordFocused}
        setPasswordFocused={setPasswordFocused}
      />
    );
  }

  return (
    <>
      <ChatShell
        user={user}
        rooms={rooms}
        activeRoomId={activeRoomId}
        setActiveRoomId={setActiveRoomId}
        messages={messages}
        draft={draft}
        setDraft={setDraft}
        sendMessage={sendMessage}
        search={search}
        setSearch={setSearch}
        searchResults={searchResults}
        searchUsers={searchUsers}
        createDirect={createDirect}
        logout={logout}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        preferences={preferences}
        onPreferencesChange={updatePreferences}
        reopenOnboarding={() => setOnboardingOpen(true)}
      />

      {onboardingOpen && user && (
        <OnboardingOverlay
          token={token}
          user={user}
          createDirect={createDirect}
          onComplete={(prefs) => {
            setPreferences(prefs || preferences);
            applyUiPreferences(prefs || preferences);
            setOnboardingOpen(false);
          }}
        />
      )}
    </>
  );
}