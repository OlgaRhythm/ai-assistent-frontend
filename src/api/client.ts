import type { Order, SupportRequest, SupportResponse } from "./types";

// В dev-режиме запросы идут через proxy из vite.config.ts на localhost:5005.
// В проде ожидается, что сборка фронтенда раздаётся тем же backend-сервером
// (см. public/ в index.ts бэкенда), поэтому базовый путь относительный.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// The backend has no structured error codes — every failure (validation,
// ML-service errors, network issues) surfaces as a plain-text "error" string
// or an "errors" array of class-validator constraint messages. We match on
// known substrings to turn those into something a user can act on. Order
// matters: more specific checks must come before generic fallbacks.
const KNOWN_ERROR_PATTERNS: Array<{ test: RegExp; message: string }> = [
  // class-validator messages from SupportRequestDto (POST /support)
  {
    test: /message must be longer than or equal to 3 characters/i,
    message: "Your message is too short — please enter at least 3 characters.",
  },
  {
    test: /message must be shorter than or equal to 300 characters/i,
    message: "Your message is too long — please keep it under 300 characters.",
  },
  {
    test: /message should not be empty/i,
    message: "Please enter a message before sending.",
  },
  {
    test: /orderId must be an integer/i,
    message: "The selected order is invalid. Please pick an order from the list again.",
  },
  {
    test: /sessionId (must be an integer|should not be empty)/i,
    message: "Your session ID is invalid. Please start a new conversation or check it in Settings.",
  },
  // auth.middleware.ts — missing/expired/invalid SSO token
  {
    test: /(missing bearer token|invalid or expired token)/i,
    message: "Your session has expired. Please reopen the assistant from the marketplace.",
  },
  // ML service rejected the text as non-English (FastAPI AppError, surfaces
  // as a generic axios 422 by the time it reaches the frontend)
  {
    test: /request failed with status code 422/i,
    message:
      "The assistant currently only understands English. Please rephrase your message in English and try again.",
  },
  // ML service unreachable
  {
    test: /econnrefused/i,
    message: "The AI assistant service is currently unavailable. Please try again in a moment.",
  },
  {
    test: /(socket hang up|econnreset|remote end closed connection)/i,
    message: "The connection to the AI assistant was interrupted. Please try again.",
  },
  {
    test: /timed? ?out/i,
    message: "The AI assistant is taking too long to respond. Please try again in a moment.",
  },
  // support.service.ts / gateway.service.ts explicit validation of ML output
  {
    test: /ML service returned an empty answer/i,
    message: "The assistant couldn't come up with an answer this time. Please try rephrasing your message.",
  },
  {
    test: /ML service returned invalid (classifier metadata|preprocessing result)/i,
    message: "The assistant had trouble processing your message. Please try again.",
  },
  // any other non-2xx from the ML service bubbling up through axios
  {
    test: /request failed with status code \d+/i,
    message: "The assistant ran into a problem answering. Please try again.",
  },
];

function toFriendlyMessage(raw: string, status: number): string {
  for (const { test, message } of KNOWN_ERROR_PATTERNS) {
    if (test.test(raw)) return message;
  }
  if (status >= 500) {
    return "Something went wrong on the assistant's side. Please try again.";
  }
  if (status >= 400) {
    return "That request couldn't be processed. Please check your input and try again.";
  }
  return raw;
}

function extractErrorMessage(details: unknown, status: number): string {
  let raw: string | undefined;

  if (details && typeof details === "object") {
    if ("error" in details && typeof details.error === "string") {
      raw = details.error;
    } else if ("errors" in details && Array.isArray(details.errors)) {
      const messages = details.errors.flatMap((constraints) =>
        constraints && typeof constraints === "object"
          ? Object.values(constraints as Record<string, string>)
          : [],
      );
      if (messages.length > 0) raw = messages.join("; ");
    }
  }

  if (raw === undefined) {
    return `The server responded with an error (${status}).`;
  }
  return toFriendlyMessage(raw, status);
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new ApiError(
      "Could not reach the server. Please check your connection.",
      undefined,
      cause,
    );
  }

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text().catch(() => undefined);
    }
    throw new ApiError(
      extractErrorMessage(details, response.status),
      response.status,
      details,
    );
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Correlates one exchange across frontend/backend/ML-service logs — sent as
// the X-Trace-Id header so a report can be grepped for across all three services.
export function generateTraceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sendSupportMessage(
  payload: SupportRequest,
  traceId: string,
): Promise<SupportResponse> {
  return request<SupportResponse>("/support", {
    method: "POST",
    headers: { "X-Trace-Id": traceId },
    body: JSON.stringify(payload),
  });
}

export function fetchOrders(): Promise<Order[]> {
  return request<Order[]>("/orders");
}
