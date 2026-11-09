import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  ApiError,
  fetchOrders,
  generateTraceId,
  reportFrontendError,
  sendSupportMessage,
  setAuthToken,
} from "./client";
import { ResponseType } from "./types";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  setAuthToken(null);
});

describe("заголовки запроса", () => {
  test("отправляет POST с заголовком trace id и без Authorization, если токен не установлен", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { text: "hi", type: ResponseType.ANSWER }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendSupportMessage({ sessionId: 1, message: "hello" }, "trace-1");

    expect(result).toEqual({ text: "hi", type: ResponseType.ANSWER });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/support");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Trace-Id"]).toBe("trace-1");
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ sessionId: 1, message: "hello" });
  });

  test("добавляет заголовок Authorization после установки токена", async () => {
    setAuthToken("sso-abc");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await fetchOrders();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/orders");
    expect(init.headers.Authorization).toBe("Bearer sso-abc");
  });
});

describe("маппинг сообщений об ошибках", () => {
  test.each([
    [
      "message must be longer than or equal to 3 characters",
      "Your message is too short — please enter at least 3 characters.",
    ],
    [
      "message must be shorter than or equal to 300 characters",
      "Your message is too long — please keep it under 300 characters.",
    ],
    ["message should not be empty", "Please enter a message before sending."],
    ["orderId must be an integer", "The selected order is invalid. Please pick an order from the list again."],
    [
      "sessionId must be an integer",
      "Your session ID is invalid. Please start a new conversation or check it in Settings.",
    ],
    ["Missing bearer token.", "Your session has expired. Please reopen the assistant from the marketplace."],
    [
      "Request failed with status code 422",
      "The assistant currently only understands English. Please rephrase your message in English and try again.",
    ],
    [
      "connect ECONNREFUSED 127.0.0.1:8000",
      "The AI assistant service is currently unavailable. Please try again in a moment.",
    ],
    ["socket hang up", "The connection to the AI assistant was interrupted. Please try again."],
    ["timeout of 5000ms exceeded", "The AI assistant is taking too long to respond. Please try again in a moment."],
    [
      "ML service returned an empty answer",
      "The assistant couldn't come up with an answer this time. Please try rephrasing your message.",
    ],
    [
      "ML service returned invalid classifier metadata",
      "The assistant had trouble processing your message. Please try again.",
    ],
  ])("сопоставляет %j с понятным сообщением", async (raw, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(400, { error: raw }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSupportMessage({ sessionId: 1, message: "hi" }, "t")).rejects.toMatchObject({
      message: expected,
    });
  });

  test("собирает сообщения class-validator из массива errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        errors: [{ isNotEmpty: "message should not be empty" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSupportMessage({ sessionId: 1, message: "" }, "t")).rejects.toMatchObject({
      message: "Please enter a message before sending.",
    });
  });

  test("использует общее сообщение для нераспознанных ошибок 5xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, { error: "database unreachable" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSupportMessage({ sessionId: 1, message: "hi" }, "t")).rejects.toMatchObject({
      message: "Something went wrong on the assistant's side. Please try again.",
      status: 503,
    });
  });

  test("использует общее сообщение для нераспознанных ошибок 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(403, { error: "forbidden" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSupportMessage({ sessionId: 1, message: "hi" }, "t")).rejects.toMatchObject({
      message: "That request couldn't be processed. Please check your input and try again.",
    });
  });

  test("сообщает код статуса, если тело ошибки не имеет распознаваемой формы", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(502, { somethingElse: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSupportMessage({ sessionId: 1, message: "hi" }, "t")).rejects.toMatchObject({
      message: "The server responded with an error (502).",
    });
  });

  test("оборачивает сетевой сбой в ApiError о проблеме соединения", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(sendSupportMessage({ sessionId: 1, message: "hi" }, "t")).rejects.toMatchObject({
      message: "Could not reach the server. Please check your connection.",
    });
  });

  test("отклонённые промисы — это ApiError с сохранённым статусом", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { error: "message should not be empty" })),
    );

    const error = await sendSupportMessage({ sessionId: 1, message: "" }, "t").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
  });
});

describe("reportFrontendError", () => {
  test("отправляет POST на /logs/frontend и не бросает исключение даже при сбое запроса", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    expect(() => reportFrontendError("boom")).not.toThrow();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledWith("/logs/frontend", expect.objectContaining({ method: "POST" }));
  });
});

describe("generateTraceId", () => {
  test("возвращает непустой id, различающийся между вызовами", () => {
    const a = generateTraceId();
    const b = generateTraceId();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});
