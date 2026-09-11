import { newDemoId } from "./demo-storage";

export const onboardingKey = "haven-demo-guide-v1";
let guideDismissed = false;

export function hasSeenGuide(): boolean {
  if (guideDismissed) return true;
  try {
    return localStorage.getItem(onboardingKey) === "seen";
  } catch {
    return false;
  }
}

export function rememberGuide(): boolean {
  guideDismissed = true;
  try {
    localStorage.setItem(onboardingKey, "seen");
    return true;
  } catch {
    return false;
  }
}

export interface DemoFeedback {
  id: string;
  createdAt: string;
  liked: string;
  confusing: string;
  missing: string;
  wouldUse: "Yes" | "Maybe" | "No";
  name?: string;
  email?: string;
}

export function feedbackId() {
  return newDemoId();
}

/** Feedback is sent only through the server; no credentials are available here. */
export async function sendFeedback(
  feedback: DemoFeedback,
): Promise<{ emailSent: boolean }> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedback),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result && typeof result.error === "string"
        ? result.error
        : "Feedback could not be sent right now. Please try again shortly. Your answers have been kept.";
    throw new Error(message);
  }
  if (result?.success !== true)
    throw new Error(
      "Could not confirm your feedback was sent. Please try again.",
    );
  return { emailSent: result.emailSent !== false };
}
