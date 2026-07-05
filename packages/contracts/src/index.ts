export const SERVICE_PORTS = {
  apiGateway: 3001,
  identity: 3101,
  billing: 3102,
  capture: 3103,
  notification: 3104,
  report: 3105,
} as const;

export const RMQ_QUEUES = {
  notifications: "veridit.notifications",
  reports: "veridit.reports",
} as const;

export const VERIDIT_EVENTS = {
  userRegistered: "identity.user_registered",
  passwordResetRequested: "identity.password_reset_requested",
  creditPurchased: "billing.credit_purchased",
  captureCompleted: "capture.completed",
} as const;

export type ServiceName =
  | "api-gateway"
  | "identity-service"
  | "billing-service"
  | "capture-service"
  | "notification-service"
  | "report-service";

export interface HealthResponse {
  service: ServiceName;
  status: "ok";
  timestamp: string;
}

export interface RegisterUserRequest {
  fullName: string;
  email: string;
  password: string;
  cpf: string;
  profile: "COMMON_USER" | "LAWYER";
  oabNumber?: string;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface UpdateUserProfileRequest {
  fullName: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  profile: "COMMON_USER" | "LAWYER";
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    profile: "COMMON_USER" | "LAWYER";
  };
}

export interface UserRegisteredEvent {
  userId: string;
  fullName: string;
  email: string;
  profile: "COMMON_USER" | "LAWYER";
  occurredAt: string;
}

export interface PasswordResetRequestedEvent {
  userId: string;
  fullName: string;
  email: string;
  code: string;
  expiresAt: string;
  occurredAt: string;
}

export interface CreditPackageResponse {
  id: string;
  name: "basic" | "medium" | "premium";
  displayName: string;
  credits: number;
  pricePerCreditInCents: number;
  benefits: string;
}

export interface PurchaseCreditsRequest {
  userId: string;
  packageName: "basic" | "medium" | "premium";
  payerEmail: string;
}

export type CreditPurchaseStatus = "PENDING" | "PAID" | "CANCELED";

export interface CreateCreditPurchaseRequest {
  userId: string;
  packageName: "basic" | "medium" | "premium";
  payerEmail: string;
}

export interface CreateCreditPurchaseResponse {
  purchaseId: string;
  status: CreditPurchaseStatus;
  checkoutUrl: string;
  providerPreferenceId: string;
}

export interface CreateEmbeddedCreditPurchaseResponse {
  purchaseId: string;
  amountInCents: number;
  credits: number;
  packageName: "basic" | "medium" | "premium";
  packageDisplayName: string;
  pricePerCreditInCents: number;
  payerEmail: string;
}

export interface CardPaymentPayerIdentification {
  type?: string;
  number?: string;
}

export interface CreateCardPaymentRequest {
  token?: string;
  installments?: number;
  paymentMethodId: string;
  issuerId?: string;
  selectedPaymentMethod?: string;
  payer: {
    email: string;
    identification?: CardPaymentPayerIdentification;
  };
}

export interface CreateCardPaymentResponse {
  purchaseId: string;
  status: CreditPurchaseStatus;
  providerPaymentId?: string;
  pix?: {
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
  };
}

export interface SimulatePaymentResponse {
  purchaseId: string;
  status: CreditPurchaseStatus;
  credits: number;
  packageName: "basic" | "medium" | "premium";
  packageDisplayName: string;
}

export interface CreditPurchaseCreatedEvent {
  purchaseId: string;
  userId: string;
  packageName: string;
  credits: number;
  payerEmail: string;
  occurredAt: string;
}

export interface StartCaptureRequest {
  userId: string;
  title: string;
  siteUrl: string;
}

export interface ContentRecordResponse {
  id: string;
  userId: string;
  title: string;
  siteUrl: string;
  status: "STARTED" | "COMPLETED";
  startedAt: string;
  finishedAt?: string;
}

export interface CaptureCompletedEvent {
  recordId: string;
  userId: string;
  title: string;
  siteUrl: string;
  imageCount: number;
  videoCount: number;
  occurredAt: string;
}
