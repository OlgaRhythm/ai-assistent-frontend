import type { ChatMessage } from "../types/chat";
import { OrderSelect } from "./OrderSelect";

interface ChatMessageItemProps {
  message: ChatMessage;
  selectedOrderId: number | undefined;
  onOrderChange: (orderId: number | undefined) => void;
  onOrderApply: (orderId: number) => void;
  disabled: boolean;
}

export function ChatMessageItem({
  message,
  selectedOrderId,
  onOrderChange,
  onOrderApply,
  disabled,
}: ChatMessageItemProps) {
  if (message.role === "system") {
    return (
      <li className={`message message--system message--${message.variant}`}>
        <span className="bubble bubble--system">{message.text}</span>
      </li>
    );
  }

  return (
    <li className={`message message--${message.role}`}>
      <span className={`bubble bubble--${message.role}`}>{message.text}</span>
      {message.role === "assistant" && message.needsOrderId && (
        <OrderSelect
          selectedOrderId={selectedOrderId}
          onChange={onOrderChange}
          onApply={onOrderApply}
          disabled={disabled}
        />
      )}
    </li>
  );
}
