import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { NewConversationButton } from "./NewConversationButton";

describe("NewConversationButton", () => {
  test("clicking shows a confirmation prompt instead of confirming immediately", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<NewConversationButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "New conversation" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  test("confirming with Yes calls onConfirm and hides the prompt", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<NewConversationButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "New conversation" })).toBeInTheDocument();
  });

  test("declining with No cancels without calling onConfirm", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<NewConversationButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "No" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "New conversation" })).toBeInTheDocument();
  });
});
