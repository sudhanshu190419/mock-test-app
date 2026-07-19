/**
 * Payment Types
 *
 * Type definitions for the course purchase flow — order creation,
 * Razorpay checkout, and enrollment polling.
 *
 * @module types/payment
 */

/**
 * Input sent to the `create-payment-order` Edge Function.
 *
 * Supports both course purchases (`courseId`) and PYQ package purchases
 * (`packageId`). Only one of `courseId` or `packageId` should be set.
 */
export interface CreatePaymentOrderInput {
  /** The course UUID the student wants to purchase (omit when buying a PYQ package). */
  courseId?: string;
  /** The PYQ package UUID the student wants to purchase (omit when buying a course). */
  packageId?: string;
  /** The authenticated user's profile UUID (profile_id from auth.users).
   *  The backend resolves this to student_details after payment via the webhook. */
  studentId: string;
  /** The institute UUID the course belongs to. */
  instituteId: string;
}

/**
 * Response returned by the `create-payment-order` Edge Function.
 */
export interface CreatePaymentOrderResponse {
  /** Internal order UUID created in the orders table. */
  orderId: string;
  /** Razorpay order ID for opening the checkout. */
  razorpayOrderId: string;
  /** Amount in the smallest currency unit (paise for INR). */
  amount: number;
  /** ISO 4217 currency code (e.g. "INR"). */
  currency: string;
  /** Course display name for the checkout description. */
  courseName: string;
  /** Description shown on the Razorpay checkout. */
  description: string;
  /** Razorpay API key (publishable key) for the frontend. */
  razorpayKey: string;
}

/**
 * Result emitted by the Razorpay SDK on successful payment.
 */
export interface RazorpayPaymentSuccess {
  /** Razorpay payment ID (e.g. pay_xxxxxxxxxxxx). */
  razorpay_payment_id: string;
  /** Razorpay order ID (e.g. order_xxxxxxxxxxxx). */
  razorpay_order_id: string;
  /** Razorpay signature for webhook verification. */
  razorpay_signature: string;
}

/**
 * Reason provided by the Razorpay SDK on payment failure/cancellation.
 */
export interface RazorpayPaymentFailure {
  /** Numeric error code from the SDK. */
  code: number;
  /** Human-readable error description. */
  description: string;
  /** Optional Razorpay order ID if it was created. */
  razorpay_order_id?: string;
}

/**
 * Overall state machine for the purchase flow on the client.
 */
export type PurchaseState =
  /** Initial state — no payment has been attempted. */
  | 'idle'
  /** Custom checkout screen/order summary before order creation. */
  | 'order_summary'
  /** Creating the payment order via Edge Function. */
  | 'creating_order'
  /** Razorpay checkout is open and awaiting user action. */
  | 'checkout_open'
  /** Payment received by Razorpay — waiting for backend webhook. */
  | 'payment_received'
  /** Actively polling for enrollment to be created. */
  | 'polling_enrollment'
  /** Enrollment confirmed — course is unlocked. */
  | 'enrolled'
  /** Payment failed, was cancelled, or encountered an error. */
  | 'failed';

/**
 * Context data carried alongside the purchase state for the UI.
 */
export interface PurchaseStateContext {
  /** Current state of the purchase flow. */
  state: PurchaseState;
  /** Error message when state is 'failed'. */
  errorMessage?: string;
  /** The Razorpay order ID for display / debugging. */
  razorpayOrderId?: string;
  /** Internal order ID for display / debugging. */
  orderId?: string;
  /** Course name for display in status messages. */
  courseName?: string;
  /** Amount formatted for display (e.g. "₹4,999"). */
  formattedAmount?: string;
}

/**
 * Configuration for the enrollment polling hook.
 */
export interface PollingConfig {
  /** Interval between polls in milliseconds. Default 2500. */
  intervalMs?: number;
  /** Maximum total polling duration in milliseconds. Default 120000 (2 min). */
  timeoutMs?: number;
}
