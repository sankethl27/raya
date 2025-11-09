import Constants from 'expo-constants';
import { Alert, Linking } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

// Razorpay payment page URL - to be configured by user later
const RAZORPAY_PAYMENT_URL = 'https://razorpay.com/payment-link/'; // Placeholder URL

interface OrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  test_mode?: boolean;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Initiate Go Pro payment for any user type (artist, partner, venue)
 */
export const initiateGoProPayment = async (
  userType: 'artist' | 'partner' | 'venue',
  token: string
): Promise<PaymentResult> => {
  try {
    // Determine the correct endpoint based on user type
    const endpointMap = {
      artist: '/api/artist/subscription/create-razorpay-order',
      partner: '/api/partner/subscription/create-razorpay-order',
      venue: '/api/venue/subscription/create-razorpay-order',
    };

    const endpoint = endpointMap[userType];

    // Step 1: Create Razorpay order
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create payment order');
    }

    const orderData: OrderResponse = await response.json();

    // Step 2: Construct payment URL (to be replaced with actual Razorpay link)
    // For now, we'll use a placeholder that can be updated later
    const paymentUrl = `${RAZORPAY_PAYMENT_URL}${orderData.order_id}`;

    // Step 3: Open payment URL in browser
    const canOpen = await Linking.canOpenURL(paymentUrl);
    
    if (canOpen) {
      await Linking.openURL(paymentUrl);
      
      return {
        success: true,
        message: 'Payment page opened. Complete the payment and return to the app.',
        data: orderData,
      };
    } else {
      throw new Error('Cannot open payment URL');
    }
  } catch (error: any) {
    console.error('Payment initiation error:', error);
    return {
      success: false,
      message: error.message || 'Failed to initiate payment',
    };
  }
};

/**
 * Verify payment after user completes Razorpay payment
 * This should be called when user returns to the app after payment
 */
export const verifyPayment = async (
  userType: 'artist' | 'partner' | 'venue',
  token: string,
  paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
): Promise<PaymentResult> => {
  try {
    const endpointMap = {
      artist: '/api/artist/subscription/verify-payment',
      partner: '/api/partner/subscription/verify-payment',
      venue: '/api/venue/subscription/verify-payment',
    };

    const endpoint = endpointMap[userType];

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Payment verification failed');
    }

    const result = await response.json();

    return {
      success: true,
      message: result.message || 'Payment verified successfully',
      data: result,
    };
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      message: error.message || 'Payment verification failed',
    };
  }
};

/**
 * Simulate payment for testing (when no Razorpay keys are configured)
 * This allows testing the flow without actual payment
 */
export const simulatePaymentForTesting = async (
  userType: 'artist' | 'partner' | 'venue',
  token: string
): Promise<PaymentResult> => {
  try {
    // Create order (will be in test mode)
    const orderResult = await initiateGoProPayment(userType, token);
    
    if (!orderResult.success) {
      return orderResult;
    }

    // Simulate payment verification with test data
    const testPaymentData = {
      razorpay_order_id: orderResult.data?.order_id || 'test_order',
      razorpay_payment_id: `test_payment_${Date.now()}`,
      razorpay_signature: 'test_signature',
    };

    // Wait a bit to simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the simulated payment
    return await verifyPayment(userType, token, testPaymentData);
  } catch (error: any) {
    console.error('Test payment error:', error);
    return {
      success: false,
      message: error.message || 'Test payment failed',
    };
  }
};

/**
 * Get subscription status for the current user
 */
export const getSubscriptionStatus = async (token: string) => {
  try {
    const response = await fetch(`${API_URL}/api/subscription/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription status');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Subscription status error:', error);
    throw error;
  }
};

/**
 * Show payment options alert
 * In test mode, gives option to simulate payment
 * In production, opens Razorpay payment page
 */
export const showPaymentOptions = (
  userType: 'artist' | 'partner' | 'venue',
  token: string,
  onSuccess: () => void
) => {
  Alert.alert(
    'Go Pro Payment',
    'Complete the payment to upgrade your account',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Test Payment (Demo)',
        onPress: async () => {
          const result = await simulatePaymentForTesting(userType, token);
          if (result.success) {
            Alert.alert('Success', result.message, [
              { text: 'OK', onPress: onSuccess },
            ]);
          } else {
            Alert.alert('Error', result.message);
          }
        },
      },
      {
        text: 'Pay with Razorpay',
        onPress: async () => {
          const result = await initiateGoProPayment(userType, token);
          if (!result.success) {
            Alert.alert('Error', result.message);
          }
          // Note: User will be redirected to payment page
          // Need to handle return from payment page separately
        },
      },
    ]
  );
};
