import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { NewConversationButton } from "./NewConversationButton";

describe("NewConversationButton", () => {
  test("клик показывает запрос подтверждения, а не подтверждает сразу", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<NewConversationButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "New conversation" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  test("подтверждение кнопкой Yes вызывает onConfirm и скрывает запрос", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<NewConversationButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "New conversation" })).toBeInTheDocument();
  });

  test("отказ кнопкой No отменяет действие без вызова onConfirm", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<NewConversationButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "No" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "New conversation" })).toBeInTheDocument();
  });
});
