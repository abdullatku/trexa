import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { apiBaseUrl } from "../../config/api";
import { Check, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Plan {
  id: string;
  name: string;
  price: number;
  interviews: number;
  features: string[];
  duration: string;
}

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  interviewsRemaining: number;
  startDate: string;
  endDate: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function ViewPlans() {
  const { accessToken, user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      fetchPlans();
      fetchSubscription();
    }
    
    // Load Razorpay script
    const razorpayScriptUrl = import.meta.env.VITE_RAZORPAY_SCRIPT_URL || 'https://checkout.razorpay.com/v1/checkout.js';
    const script = document.createElement('script');
    script.src = razorpayScriptUrl;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [accessToken]);

  const fetchPlans = async () => {
    try {
      const url = `/plans`;
      console.log('=== FETCHING PLANS ===');
      console.log('URL:', url);
      console.log('Authorization token:', accessToken ? 'Present' : 'Missing');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Full response data:', data);
      console.log('Plans array:', data.plans);
      console.log('Plans count:', data.plans?.length || 0);
      console.log('Plans details:', JSON.stringify(data.plans, null, 2));
      
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `/subscription`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setSubscription(data.subscription || null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    // Handle free plans differently - no payment needed
    if (plan.price === 0) {
      setSubscribing(plan.id);
      try {
        const response = await fetch(
          `/subscribe-free-plan`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              planId: plan.id,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to activate free plan');
        }

        toast.success('Free plan activated successfully!');
        fetchSubscription();
      } catch (error: any) {
        console.error('Free plan activation error:', error);
        toast.error(error.message || 'Failed to activate free plan');
      } finally {
        setSubscribing(null);
      }
      return;
    }

    // Paid plans - use Razorpay
    if (!window.Razorpay) {
      toast.error('Payment gateway is loading. Please try again in a moment.');
      return;
    }

    setSubscribing(plan.id);

    try {
      // Fetch Razorpay Key ID from backend
      const configResponse = await fetch(
        `/razorpay-config`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const configData = await configResponse.json();

      if (!configResponse.ok) {
        throw new Error(configData.error || 'Failed to load payment configuration');
      }

      // Create Razorpay order on backend
      const amountInPaise = plan.price * 100; // Convert to paise (1 INR = 100 paise)
      
      const orderResponse = await fetch(
        `/payments/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            planId: plan.id,
            amount: amountInPaise,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      const options = {
        key: configData.keyId, // Use the key ID from backend
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId, // This is critical - the order ID from backend
        name: 'Trexa',
        description: `${plan.name} Plan - ${plan.interviews} Interviews`,
        handler: async function (response: any) {
          // Payment successful, verify on backend
          try {
            const verifyResponse = await fetch(
              `/payments/verify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planId: plan.id,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            toast.success('Subscription activated successfully!');
            fetchSubscription();
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error.message || 'Failed to verify payment');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function() {
            setSubscribing(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setSubscribing(null);
    }
  };

  const getActivePlan = () => {
    if (!subscription) return null;
    return plans.find(p => p.id === subscription.planId);
  };

  const activePlan = getActivePlan();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Plans & Pricing</h2>
        <p className="text-gray-600">Choose a plan that fits your interview preparation needs</p>
      </div>

      {subscription && subscription.status === 'active' && activePlan && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Active Subscription: {activePlan.name}</strong>
            <br />
            Interviews remaining: {subscription.interviewsRemaining} / {activePlan.interviews}
            <br />
            Valid until: {new Date(subscription.endDate).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      )}

      {plans.length === 0 ? (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong>No Plans Available</strong>
            <br />
            Payment plans are being set up. Please contact the administrator or try refreshing the page.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = activePlan?.id === plan.id;
            
            return (
              <Card 
                key={plan.id} 
                className={`flex flex-col ${isCurrentPlan ? 'border-green-500 border-2' : ''}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle>{plan.name}</CardTitle>
                    <Badge variant={isCurrentPlan ? 'default' : 'secondary'}>
                      {isCurrentPlan ? 'Active' : plan.duration}
                    </Badge>
                  </div>
                  <CardDescription>
                    {plan.price === 0 ? (
                      <span className="text-3xl text-green-600">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl">₹{plan.price}</span>
                        <span className="text-gray-600">/{plan.duration}</span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{plan.interviews} mock interviews</span>
                    </div>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full mt-auto" 
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrentPlan || subscribing === plan.id}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isCurrentPlan ? 'Current Plan' : subscribing === plan.id ? 'Processing...' : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}