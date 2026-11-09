import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError } from "../api/client";
import { OrderSelect } from "./OrderSelect";

const { fetchOrders, reportFrontendError } = vi.hoisted(() => ({
  fetchOrders: vi.fn(),
  reportFrontendError: vi.fn(),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, fetchOrders, reportFrontendError };
});

beforeEach(() => {
  fetchOrders.mockReset();
  reportFrontendError.mockReset();
});

describe("OrderSelect", () => {
  test("loads orders and lists them once fetched", async () => {
    fetchOrders.mockResolvedValue([
      { id: 1, orderComposition: "book", status: "created", deliveryDate: "2026-01-01" },
    ]);
    render(<OrderSelect selectedOrderId={undefined} onChange={vi.fn()} onApply={vi.fn()} disabled={false} />);

    await waitFor(() => expect(screen.getByText("#1 · book · created")).toBeInTheDocument());
  });

  test("shows a friendly error and reports it when loading orders fails", async () => {
    fetchOrders.mockRejectedValue(new ApiError("Failed to load orders."));
    render(<OrderSelect selectedOrderId={undefined} onChange={vi.fn()} onApply={vi.fn()} disabled={false} />);

    await waitFor(() => expect(screen.getByText("Failed to load orders.")).toBeInTheDocument());
    expect(reportFrontendError).toHaveBeenCalled();
  });

  test("Apply is disabled until an order is selected, then calls onApply with its id", async () => {
    fetchOrders.mockResolvedValue([
      { id: 7, orderComposition: "lamp", status: "created", deliveryDate: "2026-01-02" },
    ]);
    const onChange = vi.fn();
    const onApply = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <OrderSelect selectedOrderId={undefined} onChange={onChange} onApply={onApply} disabled={false} />,
    );
    await waitFor(() => expect(screen.getByRole("option", { name: "#7 · lamp · created" })).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Order"), "7");
    expect(onChange).toHaveBeenCalledWith(7);

    rerender(<OrderSelect selectedOrderId={7} onChange={onChange} onApply={onApply} disabled={false} />);
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(7);
  });
});
