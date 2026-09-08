import { newDemoId } from "./demo-storage";

export interface DemoReply {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  direction: "outgoing";
}

const memory = new Map<string, DemoReply[]>();
const keyFor = (conversationId: string) =>
  `haven-demo-replies-v1:${conversationId}`;
const storageWarning =
  "Replies are only saved in this tab because browser storage is unavailable. They will be lost on reload.";

export function loadReplies(conversationId: string): {
  replies: DemoReply[];
  warning: string;
} {
  try {
    const saved = localStorage.getItem(keyFor(conversationId));
    const replies: unknown = saved ? JSON.parse(saved) : [];
    if (
      !Array.isArray(replies) ||
      !replies.every(
        (reply) =>
          reply &&
          typeof reply.id === "string" &&
          reply.conversationId === conversationId &&
          typeof reply.content === "string" &&
          reply.content.trim().length > 0 &&
          reply.content.length <= 10000 &&
          reply.direction === "outgoing" &&
          typeof reply.createdAt === "string" &&
          !Number.isNaN(Date.parse(reply.createdAt)),
      )
    ) {
      throw new Error("Invalid demo replies");
    }
    // Keep replies created while storage was unavailable when reopening the dialog.
    const current = memory.get(conversationId) ?? replies;
    memory.set(conversationId, current);
    return { replies: [...current], warning: "" };
  } catch {
    return {
      replies: [...(memory.get(conversationId) ?? [])],
      warning: storageWarning,
    };
  }
}

/** Local browser storage only: this module never calls the application data layer. */
export function sendDemoReply(conversationId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 10000)
    throw new Error("Enter a reply between 1 and 10,000 characters.");
  const reply: DemoReply = {
    id: newDemoId(),
    conversationId,
    content: trimmed,
    createdAt: new Date().toISOString(),
    direction: "outgoing",
  };
  const replies = [...loadReplies(conversationId).replies, reply];
  memory.set(conversationId, replies);
  try {
    localStorage.setItem(keyFor(conversationId), JSON.stringify(replies));
    return { replies, warning: "" };
  } catch {
    return { replies, warning: storageWarning };
  }
}
