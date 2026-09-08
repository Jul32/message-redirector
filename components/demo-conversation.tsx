"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Message } from "@/lib/types";
import { loadReplies, sendDemoReply, type DemoReply } from "@/lib/demo-replies";

export default function DemoConversation({ message }: { message: Message }) {
  const [replies, setReplies] = useState<DemoReply[]>([]);
  const [draft, setDraft] = useState("");
  const [warning, setWarning] = useState("");
  const [feedback, setFeedback] = useState("");
  const [ready, setReady] = useState(false);
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadReplies(message.id);
    setReplies(saved.replies);
    setWarning(saved.warning);
    setReady(true);
  }, [message.id]);

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [replies.length]);

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !draft.trim()) return;
    try {
      const result = sendDemoReply(message.id, draft);
      setReplies(result.replies);
      setWarning(result.warning);
      setDraft("");
      setFeedback("Demo reply added. Nothing was delivered externally.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not add the demo reply.",
      );
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
            disabled={!ready}
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
            disabled={!ready || !draft.trim()}
          >
            Send
          </button>
        </div>
        <p id="reply-storage-note" className="reply-storage-note">
          Saved only in this browser for demo testing.
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
