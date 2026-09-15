import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_ORIGIN, chatApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import "./LiveChat.css";

const stamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export default function LiveChat() {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const activeRef = useRef("");
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState("");
  const [status, setStatus] = useState("Connecting…");

  const active = useMemo(
    () => threads.find((item) => String(item._id) === String(activeId)) || null,
    [threads, activeId]
  );

  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    chatApi.threads(token).then((data) => setThreads(data.threads || [])).catch(() => {});
    const socket = io(API_ORIGIN, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setStatus("Live");
      socket.emit("chat:join");
      if (activeRef.current) socket.emit("chat:join", { threadId: activeRef.current });
    });
    socket.on("disconnect", () => setStatus("Offline"));
    socket.on("chat:thread", (thread) => {
      setThreads((current) => {
        const rest = current.filter((item) => String(item._id) !== String(thread._id));
        return [thread, ...rest];
      });
    });
    socket.on("chat:message", (message) => {
      if (String(message.thread) === String(activeRef.current)) {
        setMessages((current) => {
          if (current.some((item) => String(item._id) === String(message._id))) return current;
          return [...current, message];
        });
      }
      setThreads((current) => {
        const match = current.find((item) => String(item._id) === String(message.thread));
        const next = match
          ? { ...match, lastMessage: message.text, lastAt: message.createdAt }
          : { _id: message.thread, name: message.name, lastMessage: message.text, lastAt: message.createdAt };
        return [next, ...current.filter((item) => String(item._id) !== String(message.thread))];
      });
    });
    socket.on("chat:typing", (payload) => {
      if (payload?.staff) return;
      if (String(payload.threadId) !== String(activeRef.current)) return;
      setTyping(payload.typing ? `${payload.name || "Customer"} is typing…` : "");
    });
    return () => socket.disconnect();
  }, [token]);

  const openThread = async (id) => {
    setActiveId(id);
    setTyping("");
    socketRef.current?.emit("chat:join", { threadId: id });
    const data = await chatApi.thread(token, id);
    setMessages(data.messages || []);
  };

  const send = (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || !activeId) return;
    socketRef.current?.emit("chat:message", { threadId: activeId, text: body });
    setText("");
    socketRef.current?.emit("chat:typing", { threadId: activeId, typing: false });
  };

  return (
    <div className="live-chat">
      <aside className="live-chat__list">
        <div className="live-chat__status">{status}</div>
        {threads.map((thread) => (
          <button
            key={thread._id}
            className={`live-chat__thread ${String(thread._id) === String(activeId) ? "is-on" : ""}`}
            onClick={() => openThread(thread._id)}
            type="button"
          >
            <strong>{thread.name || thread.email || "Customer"}</strong>
            <span>{thread.lastMessage || "New conversation"}</span>
          </button>
        ))}
        {!threads.length ? <p className="live-chat__empty">No live chats yet.</p> : null}
      </aside>
      <section className="live-chat__pane">
        {active ? (
          <>
            <header>
              <h2>{active.name || "Customer"}</h2>
              <p>{active.email}</p>
            </header>
            <div className="live-chat__messages">
              {messages.map((item) => (
                <div key={item._id} className={`live-chat__bubble is-${item.role}`}>
                  <small>
                    {item.role === "customer" ? item.name || "Customer" : item.role === "system" ? "System" : "You"} · {stamp(item.createdAt)}
                  </small>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            {typing ? <p className="live-chat__typing">{typing}</p> : null}
            <form onSubmit={send}>
              <input
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  socketRef.current?.emit("chat:typing", {
                    threadId: activeId,
                    typing: Boolean(event.target.value.trim()),
                  });
                }}
                placeholder="Reply to this customer"
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <p className="live-chat__empty">Select a conversation.</p>
        )}
      </section>
    </div>
  );
}
