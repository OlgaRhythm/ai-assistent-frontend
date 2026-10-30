// Повторяет контракт backend: SupportRequestDto / SupportResponseDto / ml.enums.ts

export const ResponseType = {
  ANSWER: 1,
  DETAILSREQUEST: 2,
  ORDERINFOREQUEST: 3,
  OPERATOR: 4,
} as const;

export type ResponseType = (typeof ResponseType)[keyof typeof ResponseType];

export interface SupportRequest {
  sessionId: number;
  message: string;
  orderId?: number;
}

export interface SupportResponse {
  text: string;
  type: ResponseType;
}

export interface Order {
  id: number;
  orderComposition: string;
  status: string;
  deliveryDate: string;
}
