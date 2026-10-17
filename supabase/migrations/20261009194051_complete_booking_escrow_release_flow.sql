/*
# Complete the booking escrow release flow

1. Booking lifecycle
- Keep customer payment marked as held by EventHub after successful checkout.
- Move a booking to payout processing only after the provider marks the service complete and the customer confirms completion.
- Let the provider claim the pending payout once, moving the booking to payout completed.

2. Security
- Every state transition checks the authenticated caller's role for the booking.
- Provider payout claiming is atomic and single-use.
- Protected functions are executable by authenticated users only; the payment verification function remains callable by the trusted payment gateway service role.

3. Compatibility
- Accept both the UI action names (`accept` and `reject`) and the stored action names.
- Existing bookings and payment records are preserved.
*/

CREATE OR REPLACE FUNCTION provider_accept_reject_booking(
  p_booking_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
BEGIN
  SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF auth.uid() != v_booking.provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_booking.booking_status NOT IN ('awaiting_provider', 'payment_successful') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is not awaiting provider action');
  END IF;

  IF p_action IN ('accept', 'accepted') THEN
    UPDATE service_bookings
    SET provider_action = 'accepted',
        booking_status = 'booking_confirmed',
        status = 'confirmed'
    WHERE id = p_booking_id;
  ELSIF p_action IN ('reject', 'rejected') THEN
    UPDATE service_bookings
    SET provider_action = 'rejected',
        booking_status = 'cancelled',
        status = 'cancelled',
        escrow_status = CASE WHEN escrow_status = 'held' THEN 'refunded' ELSE escrow_status END
    WHERE id = p_booking_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'booking_' || CASE WHEN p_action IN ('accept', 'accepted') THEN 'accepted' ELSE 'rejected' END, 'booking', p_booking_id, jsonb_build_object('action', p_action));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION customer_confirm_completion(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_platform_fee numeric;
  v_payout_amount numeric;
BEGIN
  SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF auth.uid() != v_booking.user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_booking.booking_status != 'awaiting_customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service must be marked completed by provider first');
  END IF;

  IF v_booking.dispute_flagged THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout blocked while a dispute is open');
  END IF;

  v_platform_fee := ROUND(v_booking.total_price * 0.05, 2);
  v_payout_amount := v_booking.total_price - v_platform_fee;

  UPDATE service_bookings
  SET customer_confirmed = true,
      booking_status = 'payout_processing',
      escrow_status = CASE WHEN escrow_status = 'held' THEN 'released' ELSE escrow_status END,
      escrow_released_at = CASE WHEN escrow_status = 'held' THEN now() ELSE escrow_released_at END
  WHERE id = p_booking_id;

  INSERT INTO provider_payouts (booking_id, provider_id, amount, platform_fee, status)
  VALUES (p_booking_id, v_booking.provider_id, v_payout_amount, v_platform_fee, 'pending')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'customer_confirmed_completion', 'booking', p_booking_id, jsonb_build_object('payout_amount', v_payout_amount, 'platform_fee', v_platform_fee));

  RETURN jsonb_build_object('success', true, 'payout_amount', v_payout_amount);
END;
$$;

CREATE OR REPLACE FUNCTION provider_claim_payout(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_payout record;
BEGIN
  SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF auth.uid() != v_booking.provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_booking.booking_status != 'payout_processing' OR NOT v_booking.customer_confirmed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout is not ready');
  END IF;

  SELECT * INTO v_payout
  FROM provider_payouts
  WHERE booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_payout.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout already received or unavailable');
  END IF;

  UPDATE provider_payouts
  SET status = 'completed',
      gateway_reference = 'eventhub_wallet_' || p_booking_id::text,
      processed_at = now()
  WHERE id = v_payout.id;

  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_payout.amount
  WHERE id = v_booking.provider_id;

  UPDATE service_bookings
  SET booking_status = 'payout_completed'
  WHERE id = p_booking_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'provider_payout_completed', 'booking', p_booking_id, jsonb_build_object('amount', v_payout.amount));

  RETURN jsonb_build_object('success', true, 'amount', v_payout.amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION provider_accept_reject_booking(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION provider_accept_reject_booking(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION customer_confirm_completion(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION customer_confirm_completion(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION provider_claim_payout(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION provider_claim_payout(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION initiate_provider_payout(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION initiate_provider_payout(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION flag_dispute(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION flag_dispute(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION request_cancellation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION request_cancellation(uuid) TO authenticated;
