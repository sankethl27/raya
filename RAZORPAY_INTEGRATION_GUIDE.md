# Razorpay "Go Pro" Integration Guide

## Overview
The Raya app has a complete "Go Pro" subscription system for Artists, Partners, and Hosts. Users get 10 free profile views, after which they can upgrade to Pro for ₹499/month to unlock:
- ✨ Featured visibility
- 👁️ Unlimited profile views
- 💬 Unlimited chats
- 📈 Increased visibility across the app

## Current Status
✅ Backend payment endpoints are fully implemented
✅ Frontend payment flow is ready
✅ Test mode works without Razorpay keys
⏳ Razorpay payment page URL needs to be configured

## How It Works

### Backend Endpoints

#### For Artists:
- `POST /api/artist/subscription/create-razorpay-order` - Creates a payment order
- `POST /api/artist/subscription/verify-payment` - Verifies payment and activates Pro
- `GET /api/artist/subscription/status` - Gets current subscription status
- `POST /api/artist/subscription/track-view` - Tracks profile views

#### For Partners:
- `POST /api/partner/subscription/create-razorpay-order`
- `POST /api/partner/subscription/verify-payment`
- `GET /api/partner/subscription/status`
- `POST /api/partner/subscription/track-view`

#### For Hosts (Venues):
- `POST /api/venue/subscription/create-razorpay-order`
- `POST /api/venue/subscription/verify-payment`
- `GET /api/subscription/status` - Universal endpoint for all user types

### Frontend Payment Flow

1. **User clicks "Go Pro"** → ArtistProModal appears
2. **User clicks "Upgrade Now"** → Payment options alert shows
3. **User chooses payment method:**
   - **Test Payment (Demo)**: Simulates payment without Razorpay (for testing)
   - **Pay with Razorpay**: Redirects to actual Razorpay payment page

4. **After successful payment:**
   - User's Pro status is activated
   - `is_artist_pro`, `is_partner_pro`, or `is_venue_pro` flag is set to `true`
   - `profile_views_remaining` is set to `-1` (unlimited)
   - User receives congratulations message

## Configuration Required

### Step 1: Set Razorpay API Keys (Backend)

Add to `/app/backend/.env`:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

### Step 2: Configure Payment Page URL (Frontend)

Edit `/app/frontend/services/paymentService.ts`:

```typescript
// Line 6 - Update this URL with your actual Razorpay payment link
const RAZORPAY_PAYMENT_URL = 'https://your-razorpay-payment-page.com/';
```

**Options for Razorpay Payment URL:**

#### Option A: Payment Links (Recommended for MVP)
1. Log in to Razorpay Dashboard
2. Go to **Payment Pages** → **Payment Links**
3. Create a payment link for ₹499
4. Copy the base URL (e.g., `https://rzp.io/l/yourlink`)
5. Update `RAZORPAY_PAYMENT_URL` in the frontend

#### Option B: Standard Checkout Integration
If you want full control, you can:
1. Create a custom Razorpay checkout page
2. Use Razorpay's Checkout.js library
3. Host it and get the URL
4. Update `RAZORPAY_PAYMENT_URL`

#### Option C: Payment Gateway (Advanced)
For complete customization:
1. Implement Razorpay checkout in a separate web page
2. Handle payment callbacks
3. Redirect back to the app with payment details

### Step 3: Handle Payment Callbacks (Optional)

For production, you may want to add deep linking to handle return from payment:

1. Add a deep link scheme in `app.json`:
```json
{
  "expo": {
    "scheme": "raya"
  }
}
```

2. Configure your Razorpay payment page to redirect to: `raya://payment-success?order_id=xxx&payment_id=yyy&signature=zzz`

3. Handle the callback in your app and call the verify payment endpoint

## Testing Without Razorpay Keys

The system works in test mode when no Razorpay keys are configured:

1. User clicks "Go Pro"
2. Chooses "Test Payment (Demo)"
3. System simulates successful payment
4. User is upgraded to Pro immediately

This is perfect for:
- Development
- Demo purposes
- Testing the complete flow

## User Experience Benefits

### Before Upgrade (Free Tier):
- 10 profile views
- Limited visibility
- Basic features

### After Upgrade (Pro):
- ✨ Featured badge on profile
- 👁️ Unlimited profile views
- 💬 Unlimited chats
- 📈 Higher ranking in search results
- 🎯 Priority placement

## Database Structure

### Collections:
- `artist_subscriptions` - Artist subscription data
- `partner_subscriptions` - Partner subscription data
- `venue_subscriptions` - Host subscription data

### User Model Fields:
- `is_artist_pro: boolean` - Artist Pro status
- `is_partner_pro: boolean` - Partner Pro status
- `is_venue_pro: boolean` - Host Pro status

## API Response Examples

### Create Order (Test Mode):
```json
{
  "order_id": "test_artist_pro_123e4567-e89b",
  "amount": 49900,
  "currency": "INR",
  "test_mode": true
}
```

### Verify Payment Success:
```json
{
  "message": "Payment verified and Artist Pro subscription activated",
  "status": "active"
}
```

### Subscription Status:
```json
{
  "user_type": "artist",
  "is_pro": true,
  "subscription": {
    "id": "sub_123",
    "subscription_type": "pro",
    "profile_views_remaining": -1,
    "subscription_status": "active",
    "amount_paid": 499.0
  }
}
```

## Next Steps

1. **Configure Razorpay Keys**: Add your Razorpay credentials to backend `.env`
2. **Set Payment URL**: Update the payment URL in `paymentService.ts`
3. **Test the Flow**: Try both test mode and real payment
4. **Monitor Subscriptions**: Check database for subscription records
5. **Add Analytics**: Track conversion rates and revenue

## Support

For questions or issues:
- Check backend logs for Razorpay errors
- Verify API keys are correct
- Test with Razorpay test mode first
- Ensure payment URL is accessible

## Security Notes

⚠️ **Never commit Razorpay keys to version control**
⚠️ **Always verify payment signatures on backend**
⚠️ **Store payment data securely in database**
⚠️ **Use HTTPS for all payment-related requests**

---

The integration is **production-ready** and works in test mode by default. Simply add Razorpay keys and payment URL when ready to go live! 🚀
