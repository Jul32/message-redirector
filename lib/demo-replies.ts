import { demoRequest, usingDatabase } from "./store";
import type { Message } from "./types";
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

export async function loadReplies(conversationId: string): Promise<{
  replies: DemoReply[];
  warning: string;
}> {
  if (usingDatabase()) {
    const result = await demoRequest(undefined, conversationId);
    return { replies: result.replies.map(toReply), warning: "" };
  }
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

/** Connected mode stores simulated replies in Supabase; never delivers messages. */
export async function sendDemoReply(
  conversationId: string,
  content: string,
  id = newDemoId(),
) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 10000)
    throw new Error("Enter a reply between 1 and 10,000 characters.");
  if (usingDatabase())
    return {
      reply: toReply(
        await demoRequest({
          action: "reply",
          id,
          conversationId,
          content: trimmed,
        }),
      ),
      warning: "",
    };
  const reply: DemoReply = {
    id,
    conversationId,
    content: trimmed,
    createdAt: new Date().toISOString(),
    direction: "outgoing",
  };
  const replies = [...(await loadReplies(conversationId)).replies, reply];
  memory.set(conversationId, replies);
  try {
    localStorage.setItem(keyFor(conversationId), JSON.stringify(replies));
    return { reply, warning: "" };
  } catch {
    return { reply, warning: storageWarning };
  }
}

function toReply(message: Message): DemoReply {
  return {
    id: message.id,
    conversationId: message.reply_to!,
    content: message.content,
    createdAt: message.created_at,
    direction: "outgoing",
  };
}
