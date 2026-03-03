import React, { useState, useEffect } from 'react';
import { FiX, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { subscriptionAPI } from '../services/api';

const PaymentModal = ({ isOpen, onClose, plan, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !razorpayLoaded) {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        return;
      }
      
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => setError('Failed to load payment gateway');
      document.body.appendChild(script);
      return () => {
        // Only remove if we added it
        if (script.parentNode) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isOpen, razorpayLoaded]);

  const handlePayment = async () => {
    if (!plan || plan.name === 'Free') {
      // Free plan - no payment needed
      localStorage.setItem('selectedPlan', JSON.stringify({
        ...plan,
        planId: plan.planId
      }));
      onPaymentSuccess({ 
        plan, 
        paymentId: null, 
        transactionId: null,
        isFree: true
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call backend to initiate payment
      const paymentData = await subscriptionAPI.initiatePreRegistrationPayment(plan.planId, 'razorpay');
      
      if (paymentData.is_free) {
        // Free plan
        localStorage.setItem('selectedPlan', JSON.stringify({
          ...plan,
          planId: plan.planId
        }));
        onPaymentSuccess({ 
          plan, 
          paymentId: null, 
          transactionId: null,
          isFree: true
        });
        return;
      }

      // Store payment data
      const { order_id, transaction_id, key_id, amount } = paymentData;
      
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      // Initialize Razorpay checkout
      const options = {
        key: key_id,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        name: 'XCELTECH',
        description: `${plan.name} Plan Subscription`,
        order_id: order_id,
        handler: async function (response) {
          try {
            setLoading(true);
            
            // Verify payment with backend
            const verification = await subscriptionAPI.verifyPreRegistrationPayment(
              transaction_id,
              order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            if (verification.status === 'verified') {
              // Store payment and plan info
              localStorage.setItem('selectedPlan', JSON.stringify({
                ...plan,
                planId: plan.planId
              }));
              localStorage.setItem('paymentDetails', JSON.stringify({
                transactionId: transaction_id,
                paymentId: response.razorpay_payment_id,
                orderId: order_id,
                planId: plan.planId,
                verified: true
              }));

              onPaymentSuccess({ 
                plan,
                paymentId: response.razorpay_payment_id,
                transactionId: transaction_id,
                orderId: order_id,
                verified: true
              });
            } else {
              setError('Payment verification failed. Please try again.');
              setLoading(false);
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            setError(err.response?.data?.detail || 'Payment verification failed. Please contact support.');
            setLoading(false);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: {
          plan: plan.name,
          planId: plan.planId
        },
        theme: {
          color: '#10b981'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment failed. Please try again.');
        setLoading(false);
      });
      
      razorpay.open();
      setLoading(false);
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.response?.data?.detail || 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Confirm Plan Selection</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {plan && (
            <div className="mb-6">
              <div className={`${plan.headerColor} p-4 rounded-lg mb-4 text-white`}>
                <h3 className="text-xl font-bold">{plan.name} Plan</h3>
                <p className="text-sm text-white/90 mt-1">{plan.description}</p>
              </div>
              
              <div className="mb-4">
                <div className="text-3xl font-bold text-white mb-1">
                  {plan.monthlyPrice}<span className="text-lg font-normal text-gray-300">/mo</span>
                </div>
                {plan.yearlyPrice !== '₹0' && (
                  <div className="text-lg text-gray-300">{plan.yearlyPrice}/yr</div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h4 className="font-semibold text-white mb-2">Features:</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-300">
                      <FiCheckCircle className="text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-600 rounded-lg flex items-start">
              <FiAlertCircle className="text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={loading || (plan?.name !== 'Free' && !razorpayLoaded)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin mr-2" />
                  Processing...
                </>
              ) : plan?.name === 'Free' ? (
                'Continue to Registration'
              ) : (
                'Proceed to Payment'
              )}
            </button>
          </div>

          {plan?.name !== 'Free' && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Payment will be processed securely via Razorpay
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

