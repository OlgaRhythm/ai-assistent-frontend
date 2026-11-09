import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ChatMessageItem } from "./ChatMessageItem";
import type { ChatMessage } from "../types/chat";

describe("Отображение XSS-пейлоада в ChatMessageItem", () => {
  test("пейлоад <script> в сообщении ассистента отображается как текст, а не исполняется", () => {
    const payload = "<script>window.__xss_fired = true;</script>";
    const message: ChatMessage = { id: "m1", role: "assistant", text: payload };

    render(
      <ul>
        <ChatMessageItem
          message={message}
          selectedOrderId={undefined}
          onOrderChange={vi.fn()}
          onOrderApply={vi.fn()}
          disabled={false}
        />
      </ul>,
    );

    expect(document.querySelector("script")).toBeNull();
    expect((window as unknown as { __xss_fired?: boolean }).__xss_fired).toBeUndefined();
    expect(screen.getByText(payload)).toBeInTheDocument();
  });

  test("пейлоад <img onerror=...> в сообщении пользователя не вызывает обработчик", () => {
    const payload = '<img src=x onerror="window.__xss_fired2 = true">';
    const message: ChatMessage = { id: "m2", role: "user", text: payload };

    render(
      <ul>
        <ChatMessageItem
          message={message}
          selectedOrderId={undefined}
          onOrderChange={vi.fn()}
          onOrderApply={vi.fn()}
          disabled={false}
        />
      </ul>,
    );

    expect(document.querySelector("img")).toBeNull();
    expect((window as unknown as { __xss_fired2?: boolean }).__xss_fired2).toBeUndefined();
    expect(screen.getByText(payload)).toBeInTheDocument();
  });
});
