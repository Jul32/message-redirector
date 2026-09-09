"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usingDatabase } from "@/lib/store";
import { newDemoId } from "@/lib/demo-storage";
import type { Message } from "@/lib/types";
import { loadReplies, sendDemoReply, type DemoReply } from "@/lib/demo-replies";

export default function DemoConversation({ message }: { message: Message }) {
  const [replies, setReplies] = useState<DemoReply[]>([]);
  const [draft, setDraft] = useState("");
  const [warning, setWarning] = useState("");
  const [feedback, setFeedback] = useState("");
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const pending = useRef<{ content: string; id: string } | null>(null);
  const locked = useRef(false);
  const thread = useRef<HTMLDivElement>(null);

  async function refreshReplies() {
    setReady(false);
    try {
      const saved = await loadReplies(message.id);
      setReplies(saved.replies);
      setWarning(saved.warning);
      setFeedback("");
      setReady(true);
    } catch {
      setFeedback("Replies could not be loaded. Please try again.");
    }
  }
  useEffect(() => {
    void refreshReplies();
  }, [message.id]);

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [replies.length]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !draft.trim() || locked.current) return;
    locked.current = true;
    setSending(true);
    try {
      if (pending.current?.content !== draft)
        pending.current = { content: draft, id: newDemoId() };
      const result = await sendDemoReply(message.id, draft, pending.current.id);
      setReplies((replies) => [
        ...replies.filter((r) => r.id !== result.reply.id),
        result.reply,
      ]);
      pending.current = null;
      setWarning(result.warning);
      setDraft("");
      setFeedback("Demo reply added. Nothing was delivered externally.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not add the demo reply.",
      );
    } finally {
      locked.current = false;
      setSending(false);
    }
  }

  return (
    <section className="demo-conversation" aria-label="Demo conversation">
      <div
        className="conversation-thread"
        ref={thread}
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        <article className="conversation-bubble incoming">
          <div className="bubble-meta">
            <strong>Incoming · Tenant</strong>
            <time dateTime={message.created_at}>
              {new Date(message.created_at).toLocaleString()}
            </time>
          </div>
          <p>{message.content}</p>
        </article>
        {replies.map((reply) => (
          <article key={reply.id} className="conversation-bubble outgoing">
            <div className="bubble-meta">
              <strong>Outgoing · You · Demo</strong>
              <time dateTime={reply.createdAt}>
                {new Date(reply.createdAt).toLocaleString()}
              </time>
            </div>
            <p>{reply.content}</p>
          </article>
        ))}
      </div>
      {!ready && (
        <div role="status">
          {feedback || "Loading replies…"}
          {feedback && (
            <button
              className="text-button"
              onClick={() => void refreshReplies()}
            >
              Retry loading replies
            </button>
          )}
        </div>
      )}
      <form className="reply-composer" onSubmit={send}>
        <div className="reply-demo-note">
          <span className="demo-indicator">
            <span className="dot" />
            Demo mode
          </span>
          <span>Replies stay in Local Haven. Not delivered externally.</span>
        </div>
        <label htmlFor="demo-reply">
          Reply
          <textarea
            id="demo-reply"
            rows={3}
            maxLength={10000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a demo reply…"
            disabled={!ready || sending}
            aria-describedby="reply-storage-note"
          />
        </label>
        <div className="reply-actions">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setFeedback("External messaging integration coming soon.")
            }
          >
            Open in original app
          </button>
          <button
            type="submit"
            className="primary"
            disabled={!ready || sending || !draft.trim()}
          >
            {sending ? "Saving…" : "Send"}
          </button>
        </div>
        <p id="reply-storage-note" className="reply-storage-note">
          {usingDatabase()
            ? "Saved in the shared demo database. Not delivered externally."
            : "Saved only in this browser for demo testing."}
        </p>
        {warning && (
          <p className="storage-notice" role="status">
            {warning}
          </p>
        )}
        <p className="reply-feedback" role="status">
          {feedback}
        </p>
      </form>
    </section>
  );
}
