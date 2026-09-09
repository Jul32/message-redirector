import { newDemoId } from "./demo-storage";

export const onboardingKey = "haven-demo-guide-v1";
export const feedbackPrefix = "haven-demo-feedback-v1:";
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

/** One key per response avoids overwriting other responses. Same ID is idempotent. */
export function saveFeedback(feedback: DemoFeedback): void {
  if (!["Yes", "Maybe", "No"].includes(feedback.wouldUse))
    throw new Error("Choose Yes, Maybe, or No.");
  try {
    const key = feedbackPrefix + feedback.id;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, JSON.stringify(feedback));
  } catch {
    throw new Error(
      "Feedback could not be saved in this browser. Allow browser storage and try again. Your answers are still here.",
    );
  }
}
