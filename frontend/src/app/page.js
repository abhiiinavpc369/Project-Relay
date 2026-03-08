"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { connectSocket } from "../lib/socket";
import FloatingAuthForm from "../components/auth/FloatingAuthForm";

const TOKEN_KEY = "project-relay-token";
const ONBOARDING_PENDING_KEY = "relay:onboarding-pending";
const STATUS_KEY = "relay:statuses";

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

const DEFAULT_PREFS = {
  theme: "relay",
  uiStyle: "rounded",
  density: "comfortable",
  bubbleStyle: "solid",
  effects: true,
};

const EMOJI_SET = ["😀", "😂", "😍", "🔥", "👍", "👏", "🎉", "🤝", "💚", "🚀"];
const STICKERS = ["😎", "🤖", "🦁", "🐯", "🐑", "🦒", "💬", "✨"];
const GIFS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2MydWQ2Y3B0dHlsM2V6aDRybGQ0MXZsN3pqN3d5eDlveHh3c2x6ZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7aD2saalBwwftBIY/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHAyZ3F1N3NpeDZnMGVnOG43a2sxa2JqNWY5bW95bm9xOWwwdW5hNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgG50Fb7Mi0prBC/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaHd1b3F0Y3A5Z2IzY2Ywd2I2c2s3a2NqZ3hldXVwY2czZDA3Y2F3aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlBO7eyXzSZkJri/giphy.gif",
];

function prefKey(userId) {
  return `relay:pref:${userId}`;
}

function roomName(room, currentUserId) {
  if (!room) return "";
  if (room.isGroup && room.name) return room.name;
  const peer = room.members?.find((m) => m.id !== currentUserId);
  return peer?.name || peer?.username || "Direct Chat";
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

function Avatar({ user, size = "h-10 w-10" }) {
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="avatar" className={`${size} rounded-full object-cover border border-white/20`} />;
  }
  const initial = (user?.name || user?.username || "U").slice(0, 1).toUpperCase();
  return (
    <div className={`${size} rounded-full bg-[#17202a] border border-white/20 flex items-center justify-center text-sm font-semibold`}>
      {initial}
    </div>
  );
}

function MessageItem({ message, me }) {
  const mine = message.senderId === me.id;

  function renderBody() {
    const t = message.type || "text";
    if (t === "gif") {
      return <img src={message.meta?.url} alt="gif" className="max-h-44 rounded-lg" />;
    }
    if (t === "sticker") {
      return <p className="text-3xl leading-none">{message.meta?.emoji || "✨"}</p>;
    }
    if (t === "file") {
      return (
        <a className="underline" href={message.meta?.dataUrl} download={message.meta?.name || "file"}>
          {message.meta?.name || "Download file"}
        </a>
      );
    }
    if (t === "voice") {
      return <audio controls src={message.meta?.audio} className="max-w-[220px]" />;
    }
    if (t === "contact") {
      return (
        <div className="rounded-lg border border-white/20 bg-black/15 p-2 text-xs">
          <p className="font-semibold">{message.meta?.name || "Contact"}</p>
          <p>@{message.meta?.username}</p>
          <p>{message.meta?.email}</p>
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
        {!mine && <p className="mb-1 text-xs text-[#ffd447]">{message.sender?.name || message.sender?.username || "User"}</p>}
        {renderBody()}
      </div>
    </div>
  );
}

function SettingsPanel({ me, preferences, onPrefChange, onProfileSave, onPasswordSave }) {
  const [profile, setProfile] = useState({
    name: me?.name || "",
    username: me?.username || "",
    bio: me?.bio || "",
    avatarUrl: me?.avatarUrl || "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProfile({
      name: me?.name || "",
      username: me?.username || "",
      bio: me?.bio || "",
      avatarUrl: me?.avatarUrl || "",
    });
  }, [me]);

  async function saveProfile() {
    const ok = await onProfileSave(profile);
    setMessage(ok ? "Profile updated" : "Failed to update profile");
  }

  async function savePassword() {
    const ok = await onPasswordSave(currentPassword, newPassword);
    setMessage(ok ? "Password updated" : "Failed to update password");
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <section className="panel settings-panel flex min-h-[80vh] flex-col rounded-2xl p-5 sm:p-6">
      <div className="mb-5 border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[#3299ff]">Settings</p>
        <h3 className="text-xl font-semibold">Customize Everything</h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="setting-card">
          <p className="setting-title">Theme</p>
          <div className="setting-row">
            {THEME_OPTIONS.map((opt) => (
              <button key={opt.id} className={`onboarding-choice ${preferences.theme === opt.id ? "is-active" : ""}`} onClick={() => onPrefChange({ theme: opt.id })} type="button">
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-card">
          <p className="setting-title">UI Style</p>
          <div className="setting-row">
            {UI_OPTIONS.map((opt) => (
              <button key={opt.id} className={`onboarding-choice ${preferences.uiStyle === opt.id ? "is-active" : ""}`} onClick={() => onPrefChange({ uiStyle: opt.id })} type="button">
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-card lg:col-span-2">
          <p className="setting-title">Profile</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Username" value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
            <input className="input sm:col-span-2" placeholder="Avatar URL" value={profile.avatarUrl} onChange={(e) => setProfile((p) => ({ ...p, avatarUrl: e.target.value }))} />
            <textarea className="input sm:col-span-2" rows={3} placeholder="Bio" value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
          </div>
          <button className="btn btn-blue mt-3" onClick={saveProfile} type="button">Save Profile</button>
        </div>

        <div className="setting-card lg:col-span-2">
          <p className="setting-title">Password</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <input className="input" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button className="btn btn-blue mt-3" onClick={savePassword} type="button">Update Password</button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
    </section>
  );
}

function OnboardingOverlay({ me, onDone }) {
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState(DEFAULT_PREFS.theme);
  const [uiStyle, setUiStyle] = useState(DEFAULT_PREFS.uiStyle);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <section className="panel onboarding-box w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[#ffd447]">Onboarding</p>
        <h2 className="mt-2 text-2xl font-semibold">Welcome, {me?.name || me?.username}</h2>

        {step === 0 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Let&apos;s personalize your chat experience quickly.</p>
            <button className="login-glow-btn" onClick={() => setStep(1)} type="button">Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Pick theme and style.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((opt) => (
                <button key={opt.id} className={`onboarding-choice ${theme === opt.id ? "is-active" : ""}`} onClick={() => setTheme(opt.id)} type="button">{opt.label}</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {UI_OPTIONS.map((opt) => (
                <button key={opt.id} className={`onboarding-choice ${uiStyle === opt.id ? "is-active" : ""}`} onClick={() => setUiStyle(opt.id)} type="button">{opt.label}</button>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="btn btn-blue" onClick={() => onDone({ ...DEFAULT_PREFS, theme, uiStyle })} type="button">Finish</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomePage() {
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  const [mode, setMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [roomInviteIds, setRoomInviteIds] = useState([]);

  const [activeSection, setActiveSection] = useState("messages");
  const [menuOpen, setMenuOpen] = useState(false);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);

  const [statuses, setStatuses] = useState([]);
  const [statusText, setStatusText] = useState("");
  const [statusVideo, setStatusVideo] = useState("");

  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  const activeRoom = useMemo(() => rooms.find((r) => r.id === activeRoomId), [rooms, activeRoomId]);

  function persistPrefs(next) {
    setPreferences(next);
    applyUiPreferences(next);
    if (me?.id) window.localStorage.setItem(prefKey(me.id), JSON.stringify(next));
  }

  function updatePrefs(patch) {
    persistPrefs({ ...preferences, ...patch });
  }

  async function refreshConversations(authToken = token) {
    const data = await api("/api/chat/conversations", {}, authToken);
    setRooms(data.conversations || []);
    return data.conversations || [];
  }

  useEffect(() => {
    applyUiPreferences(DEFAULT_PREFS);
    const savedToken = window.localStorage.getItem(TOKEN_KEY);
    if (savedToken) setToken(savedToken);
    const rawStatuses = window.localStorage.getItem(STATUS_KEY);
    if (rawStatuses) {
      try {
        setStatuses(JSON.parse(rawStatuses));
      } catch {
        setStatuses([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    if (!token) {
      setMe(null);
      setRooms([]);
      setMessages([]);
      setActiveRoomId("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const meRes = await api("/api/auth/me", {}, token);
        if (cancelled) return;
        setMe(meRes.user);

        const raw = window.localStorage.getItem(prefKey(meRes.user.id));
        const pref = raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
        persistPrefs(pref);

        const list = await refreshConversations(token);
        if (list.length) setActiveRoomId(list[0].id);

        const pending = window.localStorage.getItem(ONBOARDING_PENDING_KEY) === "1";
        if (pending || !raw) setOnboardingOpen(true);
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const client = connectSocket(token);
    socketRef.current = client;

    client.on("message:new", (msg) => {
      setRooms((prev) =>
        [...prev.map((room) => (room.id === msg.conversationId ? { ...room, lastMessage: msg, updatedAt: new Date().toISOString() } : room))].sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        )
      );

      if (msg.conversationId === activeRoomId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    });

    return () => {
      client.disconnect();
      socketRef.current = null;
    };
  }, [token, activeRoomId]);

  useEffect(() => {
    if (!activeRoomId || !token) return;
    (async () => {
      try {
        const data = await api(`/api/chat/conversations/${activeRoomId}/messages`, {}, token);
        setMessages(data.messages || []);
        socketRef.current?.emit("conversation:join", { conversationId: activeRoomId });
      } catch {
        setMessages([]);
      }
    })();
  }, [activeRoomId, token]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { username, email, password };
      const res = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      if (mode === "register") window.localStorage.setItem(ONBOARDING_PENDING_KEY, "1");

      window.localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setPassword("");
    } catch (e) {
      setAuthError(e.message || "Authentication failed");
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
    } catch {
      setSearchResults([]);
    }
  }

  async function createDirect(targetUserId) {
    const data = await api("/api/chat/conversations/direct", { method: "POST", body: JSON.stringify({ targetUserId }) }, token);
    const list = await refreshConversations(token);
    const found = list.find((c) => c.id === data.conversation.id);
    setActiveRoomId(found?.id || data.conversation.id);
    setActiveSection("messages");
    return data;
  }

  async function createRoom() {
    if (!roomName.trim()) return;
    await api("/api/chat/conversations/room", { method: "POST", body: JSON.stringify({ name: roomName, memberIds: roomInviteIds }) }, token);
    setRoomName("");
    setRoomInviteIds([]);
    await refreshConversations(token);
  }

  function sendPayload(payload) {
    if (!activeRoomId) return;
    socketRef.current?.emit("message:send", { conversationId: activeRoomId, ...payload });
  }

  function sendText(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeRoomId) return;
    sendPayload({ type: "text", content: text, meta: null });
    setDraft("");
  }

  function sendEmoji(emoji) {
    setDraft((d) => `${d}${emoji}`);
  }

  function sendGif(url) {
    sendPayload({ type: "gif", content: "[GIF]", meta: { url } });
    setGifOpen(false);
  }

  function sendSticker(emoji) {
    sendPayload({ type: "sticker", content: "[STICKER]", meta: { emoji } });
    setStickerOpen(false);
  }

  function sendContact() {
    if (!me) return;
    sendPayload({
      type: "contact",
      content: "[CONTACT]",
      meta: { name: me.name || me.username, username: me.username, email: me.email },
    });
  }

  async function onFilePick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      sendPayload({ type: "file", content: `[FILE] ${file.name}`, meta: { name: file.name, mime: file.type, dataUrl: reader.result } });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function toggleVoiceRecording() {
    if (!recording) {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => sendPayload({ type: "voice", content: "[VOICE]", meta: { audio: reader.result } });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } else {
      recorderRef.current?.stop();
      setRecording(false);
    }
  }

  async function updateProfile(profile) {
    try {
      const data = await api("/api/auth/profile", { method: "PUT", body: JSON.stringify(profile) }, token);
      setMe(data.user);
      return true;
    } catch {
      return false;
    }
  }

  async function updatePassword(currentPassword, newPassword) {
    try {
      await api("/api/auth/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }, token);
      return true;
    } catch {
      return false;
    }
  }

  function addStatus() {
    if (!statusText.trim() && !statusVideo.trim()) return;
    setStatuses((prev) => [
      {
        id: crypto.randomUUID(),
        userId: me.id,
        name: me.name || me.username,
        avatarUrl: me.avatarUrl || "",
        text: statusText.trim(),
        videoUrl: statusVideo.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setStatusText("");
    setStatusVideo("");
    setActiveSection("status");
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ONBOARDING_PENDING_KEY);
    setToken("");
  }

  if (!token) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        <div className="auth-bg absolute inset-0" />
        <div className="auth-glow auth-glow-green" />
        <div className="auth-glow auth-glow-blue" />
        <div className="auth-float auth-float-1" />
        <div className="auth-float auth-float-2" />
        <div className="auth-float auth-float-3" />
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
          onPasswordFocus={() => {}}
          onPasswordBlur={() => {}}
        />
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto grid min-h-screen max-w-[1540px] grid-cols-1 gap-3 p-3 md:gap-4 md:p-4 lg:grid-cols-[220px_330px_1fr]">
        <aside className="panel flex flex-col rounded-2xl p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#35d07f]">Project Relay</p>
            <h2 className="mt-2 text-lg font-semibold">{me?.name || me?.username}</h2>
            <p className="text-xs text-slate-400">Everything in one chat platform</p>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-300">
            <p>Conversations: {rooms.length}</p>
            <p className="mt-1">Realtime: Connected</p>
          </div>

          <div className="mt-4 space-y-2">
            <input className="input" placeholder="Room name" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            <button className="btn btn-blue w-full" onClick={createRoom} type="button">Create Room</button>
          </div>

          <div className="mt-auto pt-4">
            <button className="btn w-full bg-[#0d1217] text-sm text-slate-100" onClick={logout} type="button">Logout</button>
          </div>
        </aside>

        <aside className="panel rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar user={me} size="h-9 w-9" />
              <div>
                <p className="text-sm font-semibold leading-tight">{me?.name || me?.username}</p>
                <p className="text-[11px] text-slate-400">@{me?.username}</p>
              </div>
            </div>
            <div className="relative">
              <button className="btn bg-[#0d1217] px-2" onClick={() => setMenuOpen((v) => !v)} type="button">⋮</button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-white/15 bg-[#0f141a] p-1">
                  {[
                    ["messages", "Messages"],
                    ["friends", "Friends"],
                    ["status", "Status"],
                    ["settings", "Settings"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-white/10"
                      onClick={() => {
                        setActiveSection(id);
                        setMenuOpen(false);
                      }}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <input className="input" placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn btn-blue w-full" onClick={searchUsers} type="button">Find</button>
            <div className="max-h-28 space-y-2 overflow-auto">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-sm">
                  <span>{u.name || u.username}</span>
                  <div className="flex gap-1">
                    <button className="btn bg-[#0d1217] px-2 text-xs text-slate-100" onClick={() => createDirect(u.id)} type="button">Chat</button>
                    {activeRoom?.isGroup && (
                      <button
                        className="btn bg-[#0d1217] px-2 text-xs text-slate-100"
                        onClick={() => api(`/api/chat/conversations/${activeRoom.id}/invite`, { method: "POST", body: JSON.stringify({ targetUserId: u.id }) }, token)}
                        type="button"
                      >
                        Invite
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mb-2 text-xs uppercase tracking-[0.17em] text-slate-400">Conversations</p>
          <div className="max-h-[46vh] space-y-2 overflow-auto pr-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                className={`w-full rounded-xl border px-3 py-3 text-left ${room.id === activeRoomId ? "border-[#ffd447] bg-[#11171d]" : "border-white/10 bg-[#0d1217]/70 hover:border-[#3299ff]"}`}
                onClick={() => {
                  setActiveRoomId(room.id);
                  setActiveSection("messages");
                }}
                type="button"
              >
                <p className="font-medium">{roomName(room, me?.id)}</p>
                <p className="truncate text-xs text-slate-400">{room.lastMessage?.content || "No messages"}</p>
              </button>
            ))}
          </div>
        </aside>

        {activeSection === "settings" ? (
          <SettingsPanel me={me} preferences={preferences} onPrefChange={updatePrefs} onProfileSave={updateProfile} onPasswordSave={updatePassword} />
        ) : activeSection === "status" ? (
          <section className="panel flex min-h-[80vh] flex-col rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#3299ff]">Status</p>
            <h3 className="text-xl font-semibold">Video / Text Status</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input className="input" placeholder="Write status" value={statusText} onChange={(e) => setStatusText(e.target.value)} />
              <input className="input" placeholder="Video URL (optional)" value={statusVideo} onChange={(e) => setStatusVideo(e.target.value)} />
            </div>
            <button className="btn btn-blue mt-3 w-fit" onClick={addStatus} type="button">Post Status</button>
            <div className="mt-4 space-y-3 overflow-auto">
              {statuses.map((s) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Avatar user={{ name: s.name, avatarUrl: s.avatarUrl }} size="h-7 w-7" />
                    <p className="text-sm font-semibold">{s.name}</p>
                  </div>
                  {s.text && <p className="text-sm text-slate-200">{s.text}</p>}
                  {s.videoUrl && <video className="mt-2 max-h-56 w-full rounded-lg" controls src={s.videoUrl} />}
                </div>
              ))}
              {!statuses.length && <p className="text-sm text-slate-400">No statuses yet.</p>}
            </div>
          </section>
        ) : (
          <section className="panel flex min-h-[80vh] flex-col rounded-2xl">
            <header className="border-b border-white/10 px-4 py-4 sm:px-5">
              <p className="text-xs uppercase tracking-[0.15em] text-[#3299ff]">Active Room</p>
              <h3 className="text-lg font-semibold sm:text-xl">{activeRoom ? roomName(activeRoom, me?.id) : "Select a conversation"}</h3>
            </header>

            <div className="flex-1 space-y-3 overflow-auto px-4 py-4 sm:px-5">
              {messages.map((m) => (
                <MessageItem key={m.id} message={m} me={me} />
              ))}
              {!messages.length && <p className="text-sm text-slate-400">No messages yet.</p>}
            </div>

            <form className="border-t border-white/10 p-4" onSubmit={sendText}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button className="btn bg-[#0d1217] text-xs text-slate-100" onClick={() => setEmojiOpen((v) => !v)} type="button">Emoji</button>
                <button className="btn bg-[#0d1217] text-xs text-slate-100" onClick={() => setGifOpen((v) => !v)} type="button">GIF</button>
                <button className="btn bg-[#0d1217] text-xs text-slate-100" onClick={() => setStickerOpen((v) => !v)} type="button">Sticker</button>
                <button className="btn bg-[#0d1217] text-xs text-slate-100" onClick={() => fileInputRef.current?.click()} type="button">File</button>
                <button className={`btn text-xs ${recording ? "bg-red-500 text-white" : "bg-[#0d1217] text-slate-100"}`} onClick={toggleVoiceRecording} type="button">
                  {recording ? "Stop Voice" : "Voice"}
                </button>
                <button className="btn bg-[#0d1217] text-xs text-slate-100" onClick={sendContact} type="button">Share Contact</button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePick} />
              </div>

              {emojiOpen && (
                <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/25 p-2">
                  {EMOJI_SET.map((e) => (
                    <button key={e} className="rounded px-1.5 py-1 text-xl hover:bg-white/10" onClick={() => sendEmoji(e)} type="button">{e}</button>
                  ))}
                </div>
              )}

              {gifOpen && (
                <div className="mb-2 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/25 p-2 sm:grid-cols-3">
                  {GIFS.map((g) => (
                    <button key={g} onClick={() => sendGif(g)} type="button">
                      <img src={g} alt="gif" className="h-20 w-full rounded object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {stickerOpen && (
                <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
                  {STICKERS.map((s) => (
                    <button key={s} className="rounded px-2 py-1 text-3xl hover:bg-white/10" onClick={() => sendSticker(s)} type="button">{s}</button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input className="input" disabled={!activeRoomId} placeholder={activeRoomId ? "Type a message..." : "Choose a conversation"} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button className="btn btn-green" disabled={!activeRoomId} type="submit">Send</button>
              </div>
            </form>
          </section>
        )}
      </main>

      {onboardingOpen && me && (
        <OnboardingOverlay
          me={me}
          onDone={(prefs) => {
            persistPrefs(prefs);
            window.localStorage.removeItem(ONBOARDING_PENDING_KEY);
            setOnboardingOpen(false);
          }}
        />
      )}
    </>
  );
}