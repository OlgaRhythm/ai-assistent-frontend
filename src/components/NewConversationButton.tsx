import { useState } from "react";

interface NewConversationButtonProps {
  onConfirm: () => void;
}

export function NewConversationButton({ onConfirm }: NewConversationButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (isConfirming) {
    return (
      <div className="new-conversation-confirm">
        <span>Are you sure?</span>
        <button
          type="button"
          className="new-conversation-confirm__yes"
          onClick={() => {
            setIsConfirming(false);
            onConfirm();
          }}
        >
          Yes
        </button>
        <button
          type="button"
          className="new-conversation-confirm__no"
          onClick={() => setIsConfirming(false)}
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="new-conversation-button" onClick={() => setIsConfirming(true)}>
      New conversation
    </button>
  );
}
