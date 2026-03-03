import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiDollarSign, FiPackage, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { subscriptionAPI } from '../../services/api';

export default function PlansModal({ isOpen, onClose, currentPlanId = null, organizationId = null }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      loadRazorpay();
    }
  }, [isOpen]);

  const loadRazorpay = () => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      setError('Failed to load payment gateway. Please refresh the page.');
    };
    document.body.appendChild(script);
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subscriptionAPI.listPlans(false); // Only active plans
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError(err.response?.data?.detail || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (planType) => {
    const colors = {
      FREE: 'from-gray-500 to-gray-600',
      BASIC: 'from-blue-500 to-blue-600',
      PRO: 'from-purple-500 to-purple-600',
      ENTERPRISE: 'from-indigo-500 to-indigo-600'
    };
    return colors[planType] || 'from-gray-500 to-gray-600';
  };

  const handleUpgrade = async (plan) => {
    if (!organizationId) {
      setError('Organization ID not found. Please refresh the page and try again.');
      return;
    }

    if (plan.price_per_month === 0) {
      // Free plan - no payment needed, but we still need to upgrade
      setError('Please contact support to switch to the free plan.');
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Initiate payment
      const paymentData = await subscriptionAPI.initiatePayment(
        organizationId,
        plan.plan_id,
        'razorpay'
      );

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      // Initialize Razorpay checkout
      const options = {
        key: paymentData.key_id,
        amount: paymentData.amount * 100, // Convert to paise
        currency: paymentData.currency || 'INR',
        name: 'XCELTECH',
        description: `${plan.name} Plan Subscription`,
        order_id: paymentData.order_id,
        handler: async function (response) {
          try {
            setProcessingPayment(true);
            
            // Verify payment with backend
            const verification = await subscriptionAPI.verifyPayment(
              organizationId,
              paymentData.order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            if (verification.status === 'verified' || verification.message?.includes('success')) {
              // Payment successful
              setProcessingPayment(false);
              onClose();
              // Refresh the page to show updated plan
              window.location.reload();
            } else {
              setError('Payment verification failed. Please contact support.');
              setProcessingPayment(false);
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            setError(err.response?.data?.detail || 'Payment verification failed. Please contact support.');
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: {
          plan: plan.name,
          plan_id: plan.plan_id,
          organization_id: organizationId
        },
        theme: {
          color: '#9333ea' // Purple color matching the app theme
        },
        modal: {
          ondismiss: function() {
            setProcessingPayment(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment failed. Please try again.');
        setProcessingPayment(false);
      });
      
      razorpay.open();
      setProcessingPayment(false);
    } catch (err) {
      console.error('Payment initiation error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to initiate payment. Please try again.';
      
      // Check if it's a Razorpay configuration error
      if (errorMessage.includes('not configured') || errorMessage.includes('503') || err.response?.status === 503) {
        setError('Payment gateway is not configured. Please contact your administrator to set up Razorpay payment gateway.');
      } else {
        setError(errorMessage);
      }
      setProcessingPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Available Plans</h2>
              <p className="text-gray-600 mt-1">Choose a plan that fits your organization's needs</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start">
              <FiAlertCircle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = currentPlanId === plan.plan_id;
                const isFree = plan.price_per_month === 0;
                
                return (
                  <div
                    key={plan.plan_id}
                    className={`relative bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${
                      isCurrentPlan
                        ? 'border-purple-500 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {isCurrentPlan && (
                      <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                        Current Plan
                      </div>
                    )}
                    
                    {/* Plan Header */}
                    <div className={`bg-gradient-to-r ${getPlanColor(plan.plan_type)} p-6 text-white`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <FiPackage className="w-6 h-6" />
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                      </div>
                      <p className="text-white/80 text-sm">{plan.description || 'No description'}</p>
                      
                      {/* Price */}
                      <div className="mt-4">
                        {isFree ? (
                          <div className="text-3xl font-bold">Free</div>
                        ) : (
                          <>
                            <div className="text-3xl font-bold">
                              ₹{plan.price_per_month}
                              <span className="text-lg font-normal">/mo</span>
                            </div>
                            {plan.price_per_year && (
                              <div className="text-sm text-white/80 mt-1">
                                ₹{plan.price_per_year}/yr
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Plan Features */}
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Features</h4>
                      {plan.features && Array.isArray(plan.features) && plan.features.length > 0 ? (
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start space-x-2">
                              <FiCheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No features listed</p>
                      )}

                      {/* Action Button */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        {isCurrentPlan ? (
                          <button
                            disabled
                            className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed text-sm font-medium"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpgrade(plan)}
                            disabled={processingPayment || (!isFree && !razorpayLoaded)}
                            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                              isFree
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            {processingPayment ? (
                              <>
                                <FiLoader className="animate-spin mr-2" />
                                Processing...
                              </>
                            ) : isFree ? (
                              'Select Plan'
                            ) : (
                              'Upgrade Now'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Need help choosing a plan?{' '}
              <a href="/admin/organizations/plans" className="text-purple-600 hover:text-purple-700 font-medium">
                View detailed plan comparison
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
