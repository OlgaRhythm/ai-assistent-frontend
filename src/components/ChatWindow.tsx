import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types/chat";
import { ChatMessageItem } from "./ChatMessageItem";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  messages: ChatMessage[];
  selectedOrderId: number | undefined;
  onOrderChange: (orderId: number | undefined) => void;
  onOrderApply: (orderId: number) => void;
  disabled: boolean;
  isWaitingForReply: boolean;
}

export function ChatWindow({
  messages,
  selectedOrderId,
  onOrderChange,
  onOrderApply,
  disabled,
  isWaitingForReply,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isWaitingForReply]);

  return (
    <div className="chat-window">
      <ul className="chat-window__list">
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            selectedOrderId={selectedOrderId}
            onOrderChange={onOrderChange}
            onOrderApply={onOrderApply}
            disabled={disabled}
          />
        ))}
        {isWaitingForReply && <TypingIndicator />}
      </ul>
      <div ref={bottomRef} />
    </div>
  );
}
