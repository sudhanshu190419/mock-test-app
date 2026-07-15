/**
 * useCreatePaymentOrder
 *
 * React Query mutation hook for creating a payment order via the
 * `create-payment-order` Edge Function.
 *
 * @module hooks/payment/useCreatePaymentOrder
 */

import { useMutation } from '@tanstack/react-query';
import { createPaymentOrder } from '../../services/payment/paymentService';
import type { CreatePaymentOrderInput, CreatePaymentOrderResponse } from '../../types/payment';

/**
 * Mutation hook that calls the `create-payment-order` Edge Function.
 *
 * Returns a mutation object that can be used to trigger the order creation
 * and track its loading / error / success state.
 *
 * @example
 * const { mutate, isPending, data, error } = useCreatePaymentOrder();
 *
 * // When the user taps "Buy Course":
 * mutate({
 *   courseId: 'course-uuid',
 *   studentId: 'profile-uuid',
 *   instituteId: 'institute-uuid',
 * });
 */
export function useCreatePaymentOrder() {
  return useMutation<CreatePaymentOrderResponse, Error, CreatePaymentOrderInput>({
    mutationFn: async (input) => {
      console.log('[PAYMENT_HOOK] Creating payment order...');
      const result = await createPaymentOrder(input);

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to create payment order.');
      }

      return result.data!;
    },
    onSuccess: (data) => {
      console.log('[PAYMENT_HOOK] Order created:', data.razorpayOrderId);
    },
    onError: (error) => {
      console.log('[PAYMENT_HOOK] Order creation failed:', error.message);
    },
  });
}
