import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { apiBaseUrl } from "../../config/api";
import {
  Check,
  CreditCard,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface Plan {
  id: string;
  name: string;
  price: number;
  interviews: number;
  features: string[];
  duration: string;
}

interface SelectPlanProps {
  afterSignup?: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function SelectPlan({
  afterSignup = false,
}: SelectPlanProps) {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (accessToken) {
      fetchPlans();
    }

    // Load Razorpay script
    const razorpayScriptUrl = import.meta.env.VITE_RAZORPAY_SCRIPT_URL || 'https://checkout.razorpay.com/v1/checkout.js';
    const script = document.createElement("script");
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
      console.log("=== SELECT PLAN: FETCHING PLANS ===");
      console.log("URL:", url);
      console.log(
        "Authorization token:",
        accessToken ? "Present" : "Missing",
      );

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("Plans response status:", response.status);
      console.log("Plans response ok:", response.ok);

      const data = await response.json();
      console.log("Plans response data:", data);
      console.log("Plans array:", data.plans);
      console.log("Plans count:", data.plans?.length || 0);

      setPlans(data.plans || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!window.Razorpay) {
      toast.error(
        "Payment gateway is loading. Please try again in a moment.",
      );
      return;
    }

    setSubscribing(plan.id);

    try {
      // Fetch Razorpay Key ID from backend
      const configResponse = await fetch(
        `/razorpay-config`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const configData = await configResponse.json();

      if (!configResponse.ok) {
        throw new Error(
          configData.error || "Failed to load payment configuration",
        );
      }

      // Create Razorpay order on backend
      const amountInPaise = plan.price * 100; // Convert to paise (1 INR = 100 paise)
      
      const orderResponse = await fetch(
        `/payments/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            planId: plan.id,
            amount: amountInPaise,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      const options = {
        key: configData.keyId, // Use the key ID from backend
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId, // This is critical - the order ID from backend
        name: "Trexa",
        description: `${plan.name} Plan - ${plan.interviews} Interviews`,
        handler: async function (response: any) {
          // Payment successful, verify on backend
          try {
            const verifyResponse = await fetch(
              `/payments/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id:
                    response.razorpay_payment_id,
                  razorpay_signature:
                    response.razorpay_signature,
                  planId: plan.id,
                }),
              },
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.error ||
                  "Payment verification failed",
              );
            }

            toast.success(
              "Subscription activated successfully!",
            );

            // Navigate to dashboard after successful payment
            if (afterSignup) {
              navigate("/dashboard");
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast.error(
              error.message || "Failed to verify payment",
            );
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          ondismiss: function () {
            setSubscribing(null);
            if (afterSignup) {
              // Still navigate to dashboard if they close the modal after signup
              navigate("/dashboard");
            }
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(
        error.message || "Failed to initiate payment",
      );
      setSubscribing(null);
    }
  };

  const handleSkip = () => {
    navigate("/student");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        {afterSignup ? (
          <>
            <h2 className="text-3xl mb-2">
              Welcome! Choose Your Plan
            </h2>
            <p className="text-gray-600">
              Select a plan to start your interview preparation
              journey
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl mb-2">Change Your Plan</h2>
            <p className="text-gray-600">
              Select a new plan that fits your needs
            </p>
          </>
        )}
      </div>

      {plans.length === 0 ? (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong>No Plans Available</strong>
            <br />
            Payment plans are being set up. Please contact the
            administrator or try refreshing the page.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className="flex flex-col hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle>{plan.name}</CardTitle>
                    <Badge variant="secondary">
                      {plan.duration}
                    </Badge>
                  </div>
                  <CardDescription>
                    <span className="text-3xl">
                      ₹{plan.price}
                    </span>
                    <span className="text-gray-600">
                      /{plan.duration}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.interviews} mock interviews
                      </span>
                    </div>
                    {plan.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => handleSubscribe(plan)}
                    disabled={subscribing === plan.id}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {subscribing === plan.id
                      ? "Processing..."
                      : "Subscribe Now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {afterSignup && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="gap-2"
              >
                Skip for now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}