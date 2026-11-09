import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { ApiError } from "./api/client";
import { ResponseType } from "./api/types";

const { sendSupportMessage, reportFrontendError, fetchOrders } = vi.hoisted(() => ({
  sendSupportMessage: vi.fn(),
  reportFrontendError: vi.fn(),
  fetchOrders: vi.fn().mockResolvedValue([]),
}));

vi.mock("./api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/client")>();
  return {
    ...actual,
    sendSupportMessage,
    reportFrontendError,
    fetchOrders,
    generateTraceId: () => "trace-test",
  };
});

function navigateWithToken(token = "sso-token-1") {
  window.history.pushState({}, "", `/?sso_token=${token}`);
}

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByPlaceholderText("Type a message..."), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

beforeEach(() => {
  localStorage.clear();
  sendSupportMessage.mockReset();
  reportFrontendError.mockReset();
  window.history.pushState({}, "", "/");
});

describe("шлюз аутентификации", () => {
  test("показывает сообщение-шлюз и не рендерит чат без SSO-токена", () => {
    render(<App />);
    expect(screen.getByText(/must be opened from the marketplace/i)).toBeInTheDocument();
    expect(screen.queryByText("AI Support Assistant")).not.toBeInTheDocument();
  });

  test("обрезает query-параметр sso_token и показывает чат, если токен присутствует", () => {
    navigateWithToken("abc123");
    render(<App />);
    expect(screen.getByText("AI Support Assistant")).toBeInTheDocument();
    expect(window.location.search).not.toContain("sso_token");
  });
});

describe("отправка сообщения", () => {
  test("сразу показывает сообщение пользователя и ответ ассистента после его получения", async () => {
    const user = userEvent.setup();
    sendSupportMessage.mockResolvedValue({ text: "Sure, here is your answer.", type: ResponseType.ANSWER });
    navigateWithToken();
    render(<App />);

    await sendMessage(user, "Where is my order?");

    expect(screen.getByText("Where is my order?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Sure, here is your answer.")).toBeInTheDocument());
  });

  test("переиспользует sessionId, уже сохранённый в localStorage", async () => {
    localStorage.setItem("ai-assistent-sessionId", "4242");
    const user = userEvent.setup();
    sendSupportMessage.mockResolvedValue({ text: "ok", type: ResponseType.ANSWER });
    navigateWithToken();
    render(<App />);

    await sendMessage(user, "hello there");

    await waitFor(() => expect(sendSupportMessage).toHaveBeenCalled());
    expect(sendSupportMessage.mock.calls[0][0]).toMatchObject({ sessionId: 4242 });
  });

  test("показывает системное сообщение об ошибке и репортит её при сбое отправки", async () => {
    const user = userEvent.setup();
    sendSupportMessage.mockRejectedValue(
      new ApiError("The assistant ran into a problem answering. Please try again."),
    );
    navigateWithToken();
    render(<App />);

    await sendMessage(user, "hello there");

    await waitFor(() =>
      expect(
        screen.getByText("The assistant ran into a problem answering. Please try again."),
      ).toBeInTheDocument(),
    );
    expect(reportFrontendError).toHaveBeenCalled();
  });
});

describe("новая сессия", () => {
  test("очищает сообщения и начинает новую сессию после подтверждения", async () => {
    const user = userEvent.setup();
    sendSupportMessage.mockResolvedValue({ text: "ok", type: ResponseType.ANSWER });
    navigateWithToken();
    render(<App />);

    await sendMessage(user, "hello there");
    await waitFor(() => expect(screen.getByText("hello there")).toBeInTheDocument());

    const before = localStorage.getItem("ai-assistent-sessionId");

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(screen.queryByText("hello there")).not.toBeInTheDocument();
    expect(localStorage.getItem("ai-assistent-sessionId")).not.toBe(before);
  });

  test("ничего не делает, если подтверждение отклонено", async () => {
    const user = userEvent.setup();
    sendSupportMessage.mockResolvedValue({ text: "ok", type: ResponseType.ANSWER });
    navigateWithToken();
    render(<App />);

    await sendMessage(user, "hello there");
    await waitFor(() => expect(screen.getByText("hello there")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "No" }));

    expect(screen.getByText("hello there")).toBeInTheDocument();
  });
});
