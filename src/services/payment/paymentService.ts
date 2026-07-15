/**
 * Payment Service
 *
 * Consumes the `create-payment-order` Supabase Edge Function to initiate
 * the purchase flow. Prices are never calculated on the client — the Edge
 * Function is the single source of truth for order totals.
 *
 * The `complete-course-purchase` function must never be called from the
 * mobile app. That function is triggered exclusively by the backend
 * webhook after payment verification.
 *
 * @module services/payment/paymentService
 */

import { supabase } from '../../config/supabase';
import type {
  CreatePaymentOrderInput,
  CreatePaymentOrderResponse,
} from '../../types/payment';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Call the `create-payment-order` Edge Function to initialise a purchase.
 *
 * The Edge Function:
 * 1. Looks up the course price
 * 2. Creates an `orders` row + `order_items` row
 * 3. Calls the Razorpay Orders API
 * 4. Returns the Razorpay order details
 *
 * @param input - The course, authenticated profile, and institute identifiers.
 *
 * @returns The Razorpay order details needed to open the checkout.
 *
 * @example
 * // Purchase a course
 * const result = await createPaymentOrder({
 *   courseId: 'uuid',
 *   studentId: 'uuid',
 *   instituteId: 'uuid',
 * });
 *
 * // Purchase a PYQ package
 * const result = await createPaymentOrder({
 *   packageId: 'uuid',
 *   studentId: 'uuid',
 *   instituteId: 'uuid',
 * });
 * if (result.success) {
 *   console.log(result.data.razorpayOrderId);
 * }
 */
export async function createPaymentOrder(
  input: CreatePaymentOrderInput,
): Promise<{
  success: boolean;
  data?: CreatePaymentOrderResponse;
  error?: string;
}> {
  try {
    const purchaseType = input.packageId ? 'PYQ package' : 'course';
    const purchaseId = input.packageId ?? input.courseId;
    console.log('[PAYMENT] Creating payment order for', purchaseType, ':', purchaseId);

    const { data, error } = await supabase.functions.invoke(
      'create-payment-order',
      {
        body: input,
      },
    );

    if (error) {
      console.log('[PAYMENT_ERROR] Edge Function invocation failed:', error.message);
      return { success: false, error: error.message };
    }

    // The Edge Function returns the response directly
    const response = data as CreatePaymentOrderResponse;

    // 🔍 Log the FULL response to see what the backend returns
    console.log('[PAYMENT] Raw Edge Function response:', JSON.stringify(response, null, 2));

    if (!response.razorpayOrderId) {
      console.log('[PAYMENT_ERROR] Edge Function returned no razorpayOrderId');
      return {
        success: false,
        error: 'Payment service returned an invalid response. Please try again.',
      };
    }

    console.log('[PAYMENT] Order created successfully for', purchaseType, '. Razorpay ID:', response.razorpayOrderId);
    console.log('[PAYMENT] razorpayKey present:', response.razorpayKey ? 'YES' : 'NO');
    if (!response.razorpayKey) {
      // The key might be under a different property name (e.g. snake_case)
      const allKeys = Object.keys(response);
      const keyCandidates = allKeys.filter((k) =>
        k.toLowerCase().includes('key'),
      );
      console.log('[PAYMENT] Available keys containing "key":', keyCandidates);
    }
    return { success: true, data: response };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected payment error occurred.';
    console.log('[PAYMENT_ERROR] Unexpected:', message);
    return { success: false, error: message };
  }
}

/**
 * Poll the `course_enrollments` table to check if the student has been
 * enrolled in the purchased course.
 *
 * The backend webhook creates the enrollment after verifying the payment.
 * This function is used by the polling hook to detect when access is granted.
 *
 * Row-Level Security (RLS) automatically scopes the query to the current
 * authenticated user via `get_my_student_id()` — no explicit `student_id`
 * filter is needed. The passed `_studentId` parameter is unused in the SQL
 * query; it is kept in the signature to avoid changing consumers.
 *
 * @param _studentId - Unused (RLS handles scoping).
 * @param courseId   - The purchased course UUID.
 *
 * @returns `true` when an active enrollment exists, `false` otherwise.
 */
export async function checkCourseEnrollment(
  _studentId: string,
  courseId: string,
): Promise<boolean> {
  try {
    // 🔍 DEBUG: Log the input parameters
    console.log('Polling profileId: (resolved from auth session)');
    console.log('Polling studentId:', _studentId);
    console.log('Polling courseId:', courseId);

    // Build the query
    let query = supabase
      .from('course_enrollments')
      .select('enrollment_id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('is_active', true);

    // 🔍 DEBUG: Log the query filters being applied
    const appliedFilters: Record<string, unknown> = {
      course_id: courseId,
      is_active: true,
      head: true,
      count: 'exact',
    };
    console.log('Enrollment query filters:', JSON.stringify(appliedFilters, null, 2));
    console.log('Is student_id filter present? NO — relying on RLS via get_my_student_id()');

    const { data, error, count } = await query;

    if (error) {
      console.log('Enrollment query error:', error.message);
      console.log('Enrollment query error code:', error.code);
      console.log('Enrollment query error details:', error.details);
      return false;
    }

    // 🔍 DEBUG: Log the full query result
    console.log('Enrollment query result:', JSON.stringify(data));
    console.log('Enrollment row count:', count ?? 0);
    console.log('Data array length:', data?.length ?? 0);

    // 🐛 BUG: head:true causes `data` to always be `[]`.
    // The actual count is in the `count` property, not `data.length`.
    // Previously used: (data ?? []).length > 0 — which was ALWAYS false.
    const isEnrolled = (count ?? 0) > 0;

    if (isEnrolled) {
      console.log('Enrollment DETECTED for course:', courseId, '(count =', count, ')');
    } else {
      console.log('Enrollment NOT detected. Possible causes:');
      console.log('  RLS: student_id does not match get_my_student_id()');
      console.log('  Filters: course_id or is_active filters are wrong');
      console.log('  Timing: enrollment row does not exist yet');
    }

    return isEnrolled;
  } catch (err) {
    console.log('[PAYMENT_POLL] Unexpected error:', err);
    return false;
  }
}

/**
 * Poll the `student_pyq_purchases` table to check if the student has been
 * granted access to the purchased PYQ package.
 *
 * The backend webhook creates the purchase record after verifying the payment.
 * This function is used by the PYQ polling hook to detect when access is granted.
 *
 * Row-Level Security (RLS) automatically scopes the query to the current
 * authenticated user — no explicit `student_id` filter is needed.
 * The passed `_studentId` parameter is unused in the SQL query; it is kept
 * in the signature to be interchangeable with `checkCourseEnrollment`.
 *
 * @param _studentId - Unused (RLS handles scoping).
 * @param packageId  - The purchased PYQ package UUID.
 *
 * @returns `true` when an active purchase exists, `false` otherwise.
 */
export async function checkPyqPurchase(
  _studentId: string,
  packageId: string,
): Promise<boolean> {
  try {
    console.log('[PYQ_POLL] Checking purchase for package:', packageId);

    // Build the query — same pattern as checkCourseEnrollment
    const { error, count } = await supabase
      .from('student_pyq_purchases')
      .select('purchase_id', { count: 'exact', head: true })
      .eq('package_id', packageId)
      .eq('is_active', true);

    if (error) {
      console.log('[PYQ_POLL] Query error:', error.message);
      console.log('[PYQ_POLL] Error code:', error.code);
      console.log('[PYQ_POLL] Error details:', error.details);
      return false;
    }

    const isPurchased = (count ?? 0) > 0;

    if (isPurchased) {
      console.log('[PYQ_POLL] Purchase detected for package:', packageId, '(count =', count, ')');
    } else {
      console.log('[PYQ_POLL] Purchase NOT detected for package:', packageId);
    }

    return isPurchased;
  } catch (err) {
    console.log('[PYQ_POLL] Unexpected error:', err);
    return false;
  }
}
