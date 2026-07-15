/**
 * Type declarations for react-native-razorpay
 *
 * The official Razorpay React Native SDK does not ship TypeScript
 * definitions. This declaration provides type safety for
 * the subset of the API used in the payment flow.
 *
 * @see https://github.com/razorpay/react-native-razorpay
 */

declare module 'react-native-razorpay' {
  /**
   * Razorpay checkout options.
   */
  export interface RazorpayCheckoutOptions {
    key: string;
    amount: number | string;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    order_id?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
      hide_topbar?: boolean;
    };
    modal?: {
      backdropclose?: boolean;
      escape?: boolean;
      handleback?: boolean;
      confirm_close?: boolean;
      ondismiss?: () => void;
      animation?: boolean;
    };
    external?: {
      wallets?: string[];
    };
    [key: string]: unknown;
  }

  /**
   * Data returned on successful payment.
   */
  export interface PaymentSuccessData {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  /**
   * Data returned on payment error or cancellation.
   */
  export interface PaymentErrorData {
    code: number;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
      [key: string]: unknown;
    };
  }

  /**
   * Data returned when an external wallet is selected.
   */
  export interface ExternalWalletData {
    external_wallet: string;
  }

  /**
   * The default export is a class with static methods that
   * open the Razorpay checkout and handle external wallet selection.
   */
  class RazorpayCheckout {
    /**
     * Open the Razorpay checkout modal with the given options.
     * Internally registers event listeners for payment success/error
     * via NativeEventEmitter. Returns a Promise that:
     * - Resolves with payment data on success
     * - Rejects with error data on failure / cancellation
     *
     * @param options - Checkout configuration object.
     * @returns A promise resolving to payment success data.
     */
    static open(
      options: RazorpayCheckoutOptions,
    ): Promise<PaymentSuccessData>;

    /**
     * Register a callback for external wallet selection.
     *
     * @param callback - Function called when an external wallet is selected.
     */
    static onExternalWalletSelection(
      callback: (data: ExternalWalletData) => void,
    ): void;
  }

  export default RazorpayCheckout;
}
