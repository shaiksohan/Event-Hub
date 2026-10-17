/*
# Fix single payout creation guard

1. Correctness
- Replace the unsupported conflict clause in customer completion with an existence check because existing provider payout records do not have a unique booking constraint.

2. Safety
- The booking row remains locked during the check, so one customer confirmation can create only one pending payout.
- No booking, payment, or payout data is removed.
*/

CREATE OR REPLACE FUNCTION customer_confirm_completion(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_payout_exists boolean;
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

  SELECT EXISTS (
    SELECT 1 FROM provider_payouts WHERE booking_id = p_booking_id
  ) INTO v_payout_exists;

  IF NOT v_payout_exists THEN
    INSERT INTO provider_payouts (booking_id, provider_id, amount, platform_fee, status)
    VALUES (p_booking_id, v_booking.provider_id, v_payout_amount, v_platform_fee, 'pending');
  END IF;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'customer_confirmed_completion', 'booking', p_booking_id, jsonb_build_object('payout_amount', v_payout_amount, 'platform_fee', v_platform_fee));

  RETURN jsonb_build_object('success', true, 'payout_amount', v_payout_amount);
END;
$$;
