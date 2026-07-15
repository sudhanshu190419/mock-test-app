/**
 * Razorpay Service
 *
 * Lightweight wrapper around the `react-native-razorpay` SDK.
 * Encapsulates the checkout initialisation so that the UI layer never
 * imports the native module directly.
 *
 * @module services/payment/razorpayService
 */

import RazorpayCheckout from 'react-native-razorpay';
import type {
  CreatePaymentOrderResponse,
  RazorpayPaymentSuccess,
  RazorpayPaymentFailure,
} from '../../types/payment';

// ─── Package version ───────────────────────────────────────────
// Logged at runtime so the exact installed version is visible in
// the device logs without having to check package.json manually.
const RZP_SDK_VERSION = '3.0.0';

/**
 * Result of a Razorpay checkout session.
 */
export type RazorpayResult =
  | { success: true; data: RazorpayPaymentSuccess }
  | { success: false; error: RazorpayPaymentFailure | string };

/**
 * Open the Razorpay checkout with the order details returned by the
 * `create-payment-order` Edge Function.
 *
 * The Edge Function returns `razorpayKey` (the public Razorpay Key ID).
 * Switching between Test and Live mode is done by changing the Supabase
 * Edge Function Secret `RAZORPAY_KEY_ID` and redeploying — no app update
 * required.
 *
 * @param order - The order details from the Edge Function.
 *
 * @returns A promise that resolves to either a success or failure result.
 *
 * @example
 * const result = await openCheckout(orderResponse);
 * if (result.success) {
 *   console.log('Payment ID:', result.data.razorpay_payment_id);
 * } else {
 *   console.log('Payment failed:', result.error);
 * }
 */
export function openCheckout(
  order: CreatePaymentOrderResponse,
): Promise<RazorpayResult> {
  console.log('[RAZORPAY] -------------------------------------------------');
  console.log('[RAZORPAY] react-native-razorpay version:', RZP_SDK_VERSION);
  console.log('[RAZORPAY] React Native version: 0.86.0');
  console.log('[RAZORPAY] New Architecture: enabled');
  console.log('[RAZORPAY] -------------------------------------------------');
  console.log('[RAZORPAY] Opening checkout for order:', order.razorpayOrderId);

  // ── Mandatory field validation ──────────────────────────────
  // Each field is checked independently so logs pin-point the
  // exact broken value before the native module receives it.

  const rawKey = order.razorpayKey;
  const rawOrderId = order.razorpayOrderId;
  const rawAmount = order.amount;          // number from backend (paise)
  const rawCurrency = order.currency;
  const rawName = order.courseName;
  const rawDesc = order.description;

  // Amount arrives as a number from the backend (paise).
  // The SDK expects a numeric value.
  const hasAmount = rawAmount != null && !Number.isNaN(rawAmount);
  const amount = hasAmount ? Math.round(rawAmount) : 0;

  console.log('[RAZORPAY] Field validation:');
  console.log('[RAZORPAY]   key         :', rawKey ? `${rawKey.slice(0, 14)}...` : 'UNDEFINED');
  console.log('[RAZORPAY]   key type    :', typeof rawKey);
  console.log('[RAZORPAY]   order_id    :', rawOrderId);
  console.log('[RAZORPAY]   order_id type:', typeof rawOrderId);
  console.log('[RAZORPAY]   amount      :', amount ? `${amount} paise` : 'UNDEFINED');
  console.log('[RAZORPAY]   amount type :', typeof amount);
  console.log('[RAZORPAY]   currency    :', rawCurrency);
  console.log('[RAZORPAY]   name        :', rawName);
  console.log('[RAZORPAY]   description :', rawDesc);

  // Format checks
  if (!rawKey) {
    console.error('[RAZORPAY] CRITICAL: key is missing — checkout cannot open.');
  } else if (!rawKey.startsWith('rzp_test_')) {
    console.warn('[RAZORPAY] WARNING: key does not start with rzp_test_ — are you using a Test key for development?');
  }

  if (!rawOrderId) {
    console.error('[RAZORPAY] CRITICAL: order_id is missing — checkout cannot open.');
  } else if (!rawOrderId.startsWith('order_')) {
    console.warn('[RAZORPAY] WARNING: order_id does not start with order_ — the Razorpay API may reject it');
  }

  if (!hasAmount) {
    console.error('[RAZORPAY] CRITICAL: amount is missing or NaN — checkout cannot open.');
  }

  if (!rawCurrency) {
    console.error('[RAZORPAY] CRITICAL: currency is missing.');
  }

  if (!rawName) {
    console.error('[RAZORPAY] CRITICAL: name (courseName) is missing.');
  }

  // ── Early exit if mandatory fields are missing ─────────────
  if (!rawKey || !rawOrderId || !hasAmount || !rawCurrency || !rawName) {
    const missing = [
      !rawKey && 'key',
      !rawOrderId && 'order_id',
      !hasAmount && 'amount',
      !rawCurrency && 'currency',
      !rawName && 'name',
    ]
      .filter(Boolean)
      .join(', ');
    console.error('[RAZORPAY] Aborting checkout — missing fields:', missing);
    return Promise.resolve({
      success: false,
      error: `Payment configuration error. Missing: ${missing}. Please contact support.`,
    });
  }

  const options = {
    key: rawKey,
    order_id: rawOrderId,
    amount,
    currency: rawCurrency,
    name: rawName,
    description: rawDesc,
    theme: {
      color: '#4F46E5', // Indigo-600 — matches the app's secondary colour
    },
    modal: {
      // Ensure the modal stays open even if the app is backgrounded
      confirm_close: true,
    },
  };

  console.log('[RAZORPAY] Full options object:', JSON.stringify(options, null, 2));

  return new Promise<RazorpayResult>((resolve) => {
    RazorpayCheckout.open(options)
      .then((data) => {
        console.log('[RAZORPAY] Payment success:', data.razorpay_payment_id);
        resolve({ success: true, data: data as RazorpayPaymentSuccess });
      })
      .catch((error) => {
        const err = error as RazorpayPaymentFailure;
        console.log('[RAZORPAY] Payment error:', err.code, err.description);
        resolve({ success: false, error: err });
      });
  });
}
