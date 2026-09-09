"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Modal from "./modal";
import {
  feedbackId,
  hasSeenGuide,
  rememberGuide,
  sendFeedback,
  type DemoFeedback,
} from "@/lib/demo-testing";

const steps = [
  {
    title: "All tenant communication in one inbox",
    text: "Local Haven is designed to bring messages from email, SMS, and WhatsApp into one place. This demo uses sample messages so you can explore the workflow.",
  },
  {
    title: "Stay organized automatically",
    text: "Keep messages organized by property, issue type, and status. Keyword rules automatically categorize new messages so you can find what needs attention.",
  },
  {
    title: "Reply without leaving Local Haven",
    text: "Open a conversation and try a reply. The current demo uses simulated replies for testing—nothing is delivered externally. Real external messaging integrations are planned later.",
  },
];

export default function DemoTesting() {
  const [panel, setPanel] = useState<"guide" | "feedback" | null>(null);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  useEffect(() => {
    if (!hasSeenGuide()) setPanel("guide");
  }, []);
  function dismissGuide() {
    if (!rememberGuide())
      setNotice(
        "Guide dismissed for this visit. Your browser could not remember it for future visits.",
      );
    setPanel(null);
  }
  return (
    <>
      <div className="demo-testing-actions">
        <button
          className="text-button"
          onClick={() => {
            setStep(0);
            setPanel("guide");
          }}
        >
          View demo guide
        </button>
        <button className="secondary" onClick={() => setPanel("feedback")}>
          Give feedback
        </button>
      </div>
      {notice && (
        <div className="demo-testing-notice" role="status">
          {notice}
          <button
            className="text-button"
            aria-label="Dismiss guide notice"
            onClick={() => setNotice("")}
          >
            Dismiss
          </button>
        </div>
      )}
      {panel === "guide" && (
        <Modal title="A quick guide to Local Haven" onClose={dismissGuide}>
          <div className="demo-guide">
            <p className="guide-progress">
              Step {step + 1} of {steps.length}
            </p>
            <div aria-live="polite" aria-atomic="true">
              <h3>{steps[step].title}</h3>
              <p>{steps[step].text}</p>
            </div>
            <div className="guide-dots" aria-hidden="true">
              {steps.map((_, i) => (
                <span key={i} className={i === step ? "current" : ""} />
              ))}
            </div>
            <div className="guide-actions">
              <button className="text-button" onClick={dismissGuide}>
                Skip
              </button>
              <div>
                <button
                  className="secondary"
                  disabled={step === 0}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </button>
                {step < 2 ? (
                  <button
                    className="primary"
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next
                  </button>
                ) : (
                  <button className="primary" onClick={dismissGuide}>
                    Explore demo
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {panel === "feedback" && (
        <Modal
          title="Give feedback"
          onClose={() => !sendingFeedback && setPanel(null)}
        >
          <FeedbackForm
            onDone={() => setPanel(null)}
            onSending={setSendingFeedback}
          />
        </Modal>
      )}
    </>
  );
}

function FeedbackForm({
  onDone,
  onSending,
}: {
  onDone: () => void;
  onSending: (sending: boolean) => void;
}) {
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const pending = useRef<{ fingerprint: string; payload: DemoFeedback } | null>(
    null,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setError("");
    setSending(true);
    onSending(true);
    try {
      const form = new FormData(event.currentTarget);
      const text = (key: string) => String(form.get(key) ?? "").trim();
      const answers = {
        liked: text("liked"),
        confusing: text("confusing"),
        missing: text("missing"),
        wouldUse: text("wouldUse") as DemoFeedback["wouldUse"],
        ...(text("name") ? { name: text("name") } : {}),
        ...(text("email") ? { email: text("email") } : {}),
      };
      const fingerprint = JSON.stringify(answers);
      if (pending.current?.fingerprint !== fingerprint) {
        pending.current = {
          fingerprint,
          payload: {
            ...answers,
            id: feedbackId(),
            createdAt: new Date().toISOString(),
          },
        };
      }
      await sendFeedback(pending.current.payload);
      setSubmitted(true);
    } catch (error) {
      locked.current = false;
      setError(
        "Feedback could not be sent right now. Please try again shortly. Your answers have been kept.",
      );
    } finally {
      setSending(false);
      onSending(false);
    }
  }
  if (submitted)
    return (
      <div className="feedback-success">
        <h3>Thank you for your feedback.</h3>
        <p role="status">
          Your feedback has been sent to the Local Haven team.
        </p>
        <button className="primary" onClick={onDone}>
          Done
        </button>
      </div>
    );
  return (
    <form className="feedback-form" onSubmit={submit} aria-busy={sending}>
      <fieldset disabled={sending} className="feedback-fields">
        <p className="form-description">
          Help shape Local Haven. You can respond anonymously.
        </p>
        <p className="feedback-storage-note">
          Your feedback will be emailed to the Local Haven team. Name and email
          are optional.
        </p>
        <label>
          What did you like?
          <textarea name="liked" rows={2} maxLength={4000} />
        </label>
        <label>
          What was confusing?
          <textarea name="confusing" rows={2} maxLength={4000} />
        </label>
        <label>
          What feels missing?
          <textarea name="missing" rows={2} maxLength={4000} />
        </label>
        <fieldset>
          <legend>
            Would you use something like this? <span>(required)</span>
          </legend>
          <div className="feedback-options">
            {["Yes", "Maybe", "No"].map((answer) => (
              <label key={answer}>
                <input type="radio" name="wouldUse" value={answer} required />
                {answer}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="feedback-identity">
          <label>
            Name (optional)
            <input name="name" maxLength={120} autoComplete="name" />
          </label>
          <label>
            Email (optional)
            <input
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={onDone}
            disabled={sending}
          >
            Cancel
          </button>
          <button className="primary" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Submit"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
