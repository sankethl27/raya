# Razorpay Payment Integration Setup

## Status: READY FOR ACTIVATION ✅

The Razorpay payment integration code is fully implemented and ready to be activated when you have your API keys.

## How It Works

Artists and Partners can pay to become **Featured** on the platform for enhanced visibility:
- **₹999 for 30 days** of featured placement
- Featured profiles appear at the top of listings
- Special gold badge on profile cards
- Enhanced visibility in search results

## Activation Steps

### 1. Get Razorpay API Keys

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Complete KYC verification
3. Navigate to Settings > API Keys
4. Generate new API keys (Test or Live mode)

### 2. Add Keys to Backend

Add these environment variables to `/app/backend/.env`:

```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
```

### 3. Restart Backend

```bash
sudo supervisorctl restart backend
```

The system will automatically detect the keys and enable payment features.

## Testing

### Test Mode (Recommended First)
1. Use Razorpay Test keys (starting with `rzp_test_`)
2. Test payment flow with test cards:
   - Card: 4111 1111 1111 1111
   - CVV: Any 3 digits
   - Expiry: Any future date

### Live Mode
1. Switch to Live keys (starting with `rzp_live_`)
2. Complete production checklist in Razorpay Dashboard
3. Enable webhook endpoint (optional but recommended)

## Payment Flow

1. **Artist/Partner** clicks "Become Featured" in their profile
2. System creates Razorpay order with amount and duration
3. Razorpay checkout opens for payment
4. After successful payment:
   - Profile is marked as `is_featured: true`
   - `featured_until` date is set
   - Profile appears at top of listings
5. Featured status automatically expires after duration

## API Endpoints (Already Implemented)

- `POST /api/payment/create-featured-order` - Creates payment order
- `POST /api/payment/verify-featured` - Verifies and activates featured status

## Security Features

✅ Payment signature verification
✅ Profile ownership validation
✅ Secure key storage in environment variables
✅ Transaction logging in database
✅ Automatic expiry of featured status

## Pricing Structure

Current pricing: **₹999 per 30 days**

You can modify the pricing in `/app/backend/server.py`:
```python
base_price = 99900  # ₹999 in paise (Razorpay uses paise)
```

## Notes

- All amounts in Razorpay are in **paise** (multiply rupees by 100)
- Featured status is automatically managed by the system
- Payment history is stored in `payment_orders` collection
- System logs all payment activities for audit trail

## Support

For Razorpay integration issues:
- Razorpay Docs: https://razorpay.com/docs/
- Support: support@razorpay.com
- Dashboard: https://dashboard.razorpay.com/

---

**Important**: Keep your API keys secure and never commit them to version control!
