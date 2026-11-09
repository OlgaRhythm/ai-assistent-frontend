import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { MessageInput } from "./MessageInput";

describe("MessageInput", () => {
  test("кнопка Send отключена при менее чем 3 символах (после trim) и включена при 3+", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} disabled={false} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button", { name: "Send" });

    expect(button).toBeDisabled();
    await user.type(textarea, "  ab  ");
    expect(button).toBeDisabled();
    await user.type(textarea, "c");
    expect(button).not.toBeDisabled();
  });

  test("отправка передаёт обрезанный (trim) текст и очищает поле ввода", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} disabled={false} />);

    await user.type(screen.getByPlaceholderText("Type a message..."), "  hello  ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("hello");
    expect(screen.getByPlaceholderText("Type a message...")).toHaveValue("");
  });

  test("Enter отправляет сообщение, Shift+Enter вставляет перевод строки", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} disabled={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");

    await user.type(textarea, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textarea, "line two");
    expect(onSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("line one\nline two");

    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("line one\nline two");
  });

  test("проп disabled блокирует и textarea, и кнопку Send", () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
