import { useEffect, useState } from "react";
import { ApiError, fetchOrders } from "../api/client";
import type { Order } from "../api/types";

interface OrderSelectProps {
  selectedOrderId: number | undefined;
  onChange: (orderId: number | undefined) => void;
  onApply: (orderId: number) => void;
  disabled: boolean;
}

export function OrderSelect({
  selectedOrderId,
  onChange,
  onApply,
  disabled,
}: OrderSelectProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchOrders()
      .then((result) => {
        if (!cancelled) setOrders(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOrders([]);
          setError(err instanceof ApiError ? err.message : "Failed to load orders.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="order-select__error">{error}</p>;
  }

  return (
    <div className="order-select">
      <select
        className="order-select__input"
        value={selectedOrderId ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : undefined)
        }
        disabled={disabled}
        aria-label="Order"
      >
        <option value="">No order selected</option>
        {orders.map((order) => (
          <option key={order.id} value={order.id}>
            #{order.id} · {order.orderComposition} · {order.status}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="order-select__apply"
        disabled={disabled || selectedOrderId === undefined}
        onClick={() => selectedOrderId !== undefined && onApply(selectedOrderId)}
      >
        Apply
      </button>
    </div>
  );
}
