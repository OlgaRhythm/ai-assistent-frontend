export type ChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      needsOrderId?: boolean;
    }
  | {
      id: string;
      role: "system";
      text: string;
      variant: "error" | "info";
    };
