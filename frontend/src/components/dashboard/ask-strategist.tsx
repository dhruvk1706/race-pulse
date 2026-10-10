"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MAX_QUESTION, type AskError, type AskRequest, type AskResponse } from "@/lib/f1/ask";

interface Turn { question: string; lap: number; answer?: string; error?: string }

// Each question is answered on its own from the strategy at that lap; the log is per session, client-side only.
export function AskStrategist({ target, session }: { target: { sessionKey: number; lap: number } | null; session?: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<{ key?: number; turns: Turn[] }>({ turns: [] });
  const input = useRef<HTMLTextAreaElement>(null);
  const turns = chat.key === target?.sessionKey ? chat.turns : [];

  // The Modal (a child) has already called showModal() when this runs, so focus lands in the dialog.
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = question.trim();
    if (!target || !text || busy) return;
    const { sessionKey: key, lap } = target;
    const request: AskRequest = { question: text, sessionKey: key, lap };
    setChat((current) => ({ key, turns: [...(current.key === key ? current.turns : []), { question: text, lap }] }));
    setQuestion("");
    setBusy(true);
    let result: Pick<Turn, "answer" | "error">;
    try {
      const response = await fetch("/api/f1/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const body = await response.json().catch(() => null) as AskResponse | AskError | null;
      result = response.ok && body && "answer" in body ? { answer: body.answer } : { error: body && "error" in body ? body.error : "The strategist is unavailable right now." };
    } catch {
      result = { error: "Network error. Check your connection and try again." };
    }
    setChat((current) => current.key !== key ? current : { key, turns: current.turns.map((turn, index) => index === current.turns.length - 1 ? { ...turn, ...result } : turn) });
    setBusy(false);
    input.current?.focus();
  }

  return <>
    <button type="button" className="text-action" disabled={!target} onClick={() => setOpen(true)}><MessageSquare size={16} aria-hidden="true" />Ask the strategist</button>
    <Modal title="Ask the strategist" open={open} onClose={() => setOpen(false)} className="ask-drawer">
      {target && <p className="detail-meta">{session ? `${session} · ` : ""}As of lap {target.lap}</p>}
      <div className="ask-log" role="log" aria-live="polite" aria-busy={busy}>{turns.length ? turns.map((turn, index) => <article className="ask-turn" key={index}>
        <p className="ask-question"><span>Lap {turn.lap}</span>{turn.question}</p>
        <p className={`ask-answer${turn.error ? " error" : ""}`}>{turn.answer ?? turn.error ?? "Thinking…"}</p>
      </article>) : <p className="data-empty">Ask about pit windows, tyre wear, gaps or undercuts at this lap. Answers use only this race&apos;s strategy data and recent headlines.</p>}</div>
      <form className="ask-form" onSubmit={send}>
        <textarea ref={input} aria-label="Your question" aria-describedby="ask-count" rows={3} maxLength={MAX_QUESTION} placeholder="Should the leader pit now?" value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) void send(event); }} />
        <div className="ask-form-row">
          <span id="ask-count">{question.length}/{MAX_QUESTION} · Enter to send, Shift+Enter for a new line</span>
          <button type="submit" className="ask-send" disabled={busy || !question.trim()}>{busy ? "Thinking…" : "Send"}<Send size={15} aria-hidden="true" /></button>
        </div>
      </form>
    </Modal>
  </>;
}
