export async function handleTopupCreateOrder(request: Request) {
  // Feature temporarily disabled - Razorpay compliance requirement
  return Response.json(
    { 
      error: 'Feature Temporarily Disabled',
      message: 'Deposit feature is temporarily disabled. Razorpay regulations require a valid Play Store link for payment gateway integration. This feature will be enabled once the app is published on Play Store.',
      disabled: true
    },
    { status: 503 }
  );
}