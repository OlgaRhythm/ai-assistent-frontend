import { useState } from "react";
import { ApiError, generateTraceId, reportFrontendError, sendSupportMessage, setAuthToken } from "./api/client";
import { ResponseType } from "./api/types";
import { ChatWindow } from "./components/ChatWindow";
import { MessageInput } from "./components/MessageInput";
import { NewConversationButton } from "./components/NewConversationButton";
import type { ChatMessage } from "./types/chat";
import "./App.css";

function randomId(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function readOrCreateId(storageKey: string): number {
  const stored = localStorage.getItem(storageKey);
  if (stored) return Number(stored);
  const created = randomId();
  localStorage.setItem(storageKey, String(created));
  return created;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function consumeSsoTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("sso_token");
  if (!token) return null;

  params.delete("sso_token");
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", newUrl);
  return token;
}

function App() {
  const [authToken] = useState(() => {
    const token = consumeSsoTokenFromUrl();
    setAuthToken(token);
    return token;
  });
  const [sessionId, setSessionId] = useState(() => readOrCreateId("ai-assistent-sessionId"));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);

  function addMessage(message: ChatMessage) {
    setMessages((prev) => [...prev, message]);
  }

  async function handleSend(text: string, orderIdOverride?: number) {
    const orderId = orderIdOverride ?? selectedOrderId;
    const traceId = generateTraceId();
    addMessage({ id: createMessageId(), role: "user", text });
    setIsSending(true);

    try {
      const response = await sendSupportMessage(
        { sessionId, message: text, orderId },
        traceId,
      );

      addMessage({
        id: createMessageId(),
        role: "assistant",
        text: response.text,
        needsOrderId: response.type === ResponseType.ORDERINFOREQUEST,
      });
    } catch (error) {
      const text =
        error instanceof ApiError
          ? error.message
          : "Unexpected error while sending the message.";
      reportFrontendError(error instanceof Error ? error.message : String(error));
      addMessage({ id: createMessageId(), role: "system", text, variant: "error" });
    } finally {
      setIsSending(false);
    }
  }

  function handleApplyOrder(orderId: number) {
    setSelectedOrderId(orderId);
    handleSend(`Order #${orderId} selected.`, orderId);
  }

  function handleNewConversation() {
    const newSessionId = randomId();
    localStorage.setItem("ai-assistent-sessionId", String(newSessionId));
    setSessionId(newSessionId);
    setMessages([]);
    setSelectedOrderId(undefined);
  }

  if (!authToken) {
    return (
      <div className="app app--unauthenticated">
        <p>
          This assistant must be opened from the marketplace — no identity token was
          provided.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>AI Support Assistant</h1>
        <NewConversationButton onConfirm={handleNewConversation} />
      </header>

      <ChatWindow
        messages={messages}
        selectedOrderId={selectedOrderId}
        onOrderChange={setSelectedOrderId}
        onOrderApply={handleApplyOrder}
        disabled={isSending}
        isWaitingForReply={isSending}
      />

      <MessageInput onSend={handleSend} disabled={isSending} />
    </div>
  );
}

export default App;
