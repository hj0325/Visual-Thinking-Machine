"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function makeSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Request failed");
  }
  return json;
}

function Badge({ children, tone = "neutral" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
      : tone === "red"
        ? "bg-rose-500/15 text-rose-300 ring-rose-500/20"
        : tone === "amber"
          ? "bg-amber-500/15 text-amber-200 ring-amber-500/20"
          : "bg-zinc-500/15 text-zinc-200 ring-zinc-500/20";

  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1", cls)}>
      {children}
    </span>
  );
}

function TypePill({ type }) {
  const map = {
    Trigger: "bg-sky-500/15 text-sky-200 ring-sky-500/20",
    Action: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
    Condition: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
    UI: "bg-violet-500/15 text-violet-200 ring-violet-500/20",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1", map[type] || map.UI)}>
      {type}
    </span>
  );
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [draft, setDraft] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("visual");
  const [backendOk, setBackendOk] = useState(null);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    setSessionId(makeSessionId());
  }, []);

  const status = data?.status || "chat";
  const currentStep = data?.current_step || "ask";
  const canConfirm = status === "confirm";
  const completed = status === "completed";

  const nodes = useMemo(() => data?.visual_code?.nodes || [], [data]);
  const edges = useMemo(() => data?.visual_code?.edges || [], [data]);

  useEffect(() => {
    // Auto-scroll chat
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, data?.assistant_message]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error("health not ok");
        if (!cancelled) setBackendOk(true);
      } catch {
        if (!cancelled) setBackendOk(false);
      }
    }

    check();
    const id = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function newSession() {
    const sid = makeSessionId();
    setSessionId(sid);
    setDraft("");
    setFeedbackText("");
    setError("");
    setData(null);
    setMessages([]);
    setTab("visual");
  }

  async function sendChat(text) {
    setError("");
    setLoading(true);
    const userText = (text || "").trim();
    try {
      if (userText) {
        setMessages((prev) => [...prev, { role: "user", content: userText }]);
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userText || "Hi",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setData(json);
      if (json?.assistant_message) {
        setMessages((prev) => [...prev, { role: "assistant", content: json.assistant_message }]);
      }
      if (json?.status === "confirm") setTab("plan");
      if (json?.status === "completed") setTab("visual");
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleChat() {
    await sendChat(draft);
    setDraft("");
  }

  async function handleFeedback(confirmed) {
    setError("");
    setLoading(true);
    try {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: confirmed ? "YES (confirmed)" : `NO — ${feedbackText || "please refine"}`,
          meta: "feedback",
        },
      ]);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          confirmed,
          feedback_text: confirmed ? null : feedbackText || "Not quite. Please refine.",
        }),
      });
      const json2 = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json2?.error || "Request failed");
      setData(json2);
      if (json2?.assistant_message) setMessages((prev) => [...prev, { role: "assistant", content: json2.assistant_message }]);
      if (json2?.status === "completed") setTab("visual");
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-sm font-semibold">
              TM
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Thinking Machine</div>
              <div className="text-xs text-zinc-400">Empathize loop test UI</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {backendOk === null ? <Badge tone="neutral">Backend: checking</Badge> : null}
            {backendOk === true ? <Badge tone="green">Backend: connected</Badge> : null}
            {backendOk === false ? <Badge tone="red">Backend: disconnected</Badge> : null}
            <Badge tone="amber">status: {status}</Badge>
            <Badge>step: {currentStep}</Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-4 px-4 py-4 lg:grid-cols-[280px_1fr_420px]">
        {/* Sidebar */}
        <aside className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Session</div>
            <button
              className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
              onClick={newSession}
              disabled={loading}
            >
              New
            </button>
          </div>

          <label className="text-xs text-zinc-400">session_id</label>
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-700"
            placeholder="session id"
            disabled={loading}
          />

          <div className="mt-3 space-y-2 text-xs text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-2">
              <div className="font-medium">How to use</div>
              <div className="mt-1 text-zinc-400">
                1) Send /chat (first reply may ask a question)
                <br />
                2) Send your idea again
                <br />
                3) Confirm YES/NO
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-2">
              <div className="font-medium">API</div>
              <div className="mt-1 text-zinc-400">
                Proxy: <code className="text-zinc-200">/api/chat</code>, <code className="text-zinc-200">/api/feedback</code>
                <br />
                Backend: <code className="text-zinc-200">{process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}</code>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
              <div className="font-semibold">Error</div>
              <div className="mt-1 whitespace-pre-wrap">{error}</div>
            </div>
          ) : null}
        </aside>

        {/* Chat */}
        <section className="flex min-h-[70vh] flex-col rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="text-sm font-semibold">Chat</div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {canConfirm ? <Badge tone="amber">Needs confirmation</Badge> : null}
              {completed ? <Badge tone="green">Visual code ready</Badge> : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/20 p-4 text-sm text-zinc-300">
                <div className="font-semibold">Start here</div>
                <div className="mt-1 text-zinc-400">
                  Type an idea and hit <span className="text-zinc-200">Send</span>. The assistant will guide you to a clear logical flow before generating visual code.
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div key={idx} className={cx("flex", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cx(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ring-1",
                        isUser
                          ? "bg-zinc-200 text-zinc-950 ring-white/10"
                          : "bg-zinc-950/40 text-zinc-100 ring-zinc-800"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {canConfirm ? (
            <div className="border-t border-zinc-800 px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-zinc-200">Confirm the interpretation</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                  onClick={() => handleFeedback(true)}
                  disabled={loading}
                >
                  YES
                </button>
                <button
                  className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                  onClick={() => handleFeedback(false)}
                  disabled={loading}
                >
                  NO
                </button>
                <input
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-w-[220px] flex-1 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-700"
                  placeholder="If NO, what should change?"
                  disabled={loading}
                />
              </div>
            </div>
          ) : null}

          <div className="border-t border-zinc-800 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-700"
                placeholder='Write your idea… (e.g., "I want a habit tracker that nags me gently")'
                disabled={loading}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleChat();
                }}
              />
              <button
                className="rounded-xl bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-50"
                onClick={handleChat}
                disabled={loading || !sessionId}
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-zinc-500">Tip: Press Ctrl/⌘ + Enter to send</div>
          </div>
        </section>

        {/* Inspector */}
        <aside className="rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="text-sm font-semibold">Inspector</div>
            <div className="flex gap-1 rounded-lg bg-zinc-950/40 p-1 ring-1 ring-zinc-800">
              {[
                ["visual", "Visual"],
                ["plan", "Plan"],
                ["raw", "Raw"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={cx(
                    "rounded-md px-2 py-1 text-xs",
                    tab === key ? "bg-zinc-200 text-zinc-950" : "text-zinc-300 hover:bg-zinc-800/60"
                  )}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {tab === "plan" ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-zinc-300">plan_context</div>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-200">
                    {data?.plan_context || "(empty)"}
                  </pre>
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-300">proposed_logic</div>
                  <pre className="mt-1 max-h-56 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-200">
                    {data?.proposed_logic || "(empty)"}
                  </pre>
                </div>
              </div>
            ) : null}

            {tab === "visual" ? (
              <div className="space-y-3">
                {!completed ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3 text-sm text-zinc-300">
                    Visual code is not ready yet. Confirm <span className="text-zinc-100">YES</span> to generate nodes/edges.
                  </div>
                ) : null}

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-200">Nodes</div>
                    <Badge>{nodes.length}</Badge>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {nodes.length === 0 ? (
                      <div className="text-xs text-zinc-500">(empty)</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-zinc-950/80 text-zinc-400">
                          <tr>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2">Label</th>
                            <th className="py-2">Desc</th>
                          </tr>
                        </thead>
                        <tbody className="text-zinc-200">
                          {nodes.map((n) => (
                            <tr key={n.id} className="border-t border-zinc-800/60 align-top">
                              <td className="py-2 pr-2">
                                <TypePill type={n.type} />
                              </td>
                              <td className="py-2 pr-2 font-medium">{n.label}</td>
                              <td className="py-2 text-zinc-300">{n.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-200">Edges</div>
                    <Badge>{edges.length}</Badge>
                  </div>
                  <div className="max-h-40 overflow-auto text-xs text-zinc-200">
                    {edges.length === 0 ? (
                      <div className="text-xs text-zinc-500">(empty)</div>
                    ) : (
                      <ul className="space-y-1">
                        {edges.map((e, i) => (
                          <li key={i} className="text-zinc-300">
                            <span className="font-medium text-zinc-100">{e.source}</span> →{" "}
                            <span className="font-medium text-zinc-100">{e.target}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "raw" ? (
              <pre className="max-h-[70vh] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-200">
                {pretty(data)}
              </pre>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

