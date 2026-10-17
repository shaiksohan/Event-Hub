/*
# Automatically release completed booking payouts

1. Purpose
- Keep customer payments in EventHub escrow while a service is in progress.
- When the provider marks the service complete and the customer confirms completion, automatically release the held funds to the provider's EventHub wallet.

2. Booking lifecycle changes
- `service_bookings.customer_confirmed` is set to true.
- `service_bookings.booking_status` moves directly from `awaiting_customer` to `payout_completed`.
- `service_bookings.escrow_status` changes from `held` to `released`.
- `service_bookings.escrow_released_at` records the release time.

3. Payout changes
- `provider_payouts` is created or completed during the same protected database operation.
- The provider's `profiles.wallet_balance` is credited once with the service total minus the 5% platform fee.
- Existing completed payouts are recognized without crediting the provider again.

4. Security
- The operation is a SECURITY DEFINER function with a fixed public search path.
- Only the authenticated customer who owns the booking can confirm completion.
- Open disputes block confirmation and payout.
- The booking row and existing payout row are locked while the operation runs to prevent duplicate credits.
- Anonymous users cannot execute the function.

5. Important notes
- Provider completion is still required before customer confirmation is accepted.
- The provider's EventHub wallet is the internal payout destination used by the existing application.
- No booking, payment, or payout records are deleted.
*/

CREATE OR REPLACE FUNCTION customer_confirm_completion(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_payout record;
  v_platform_fee numeric;
  v_payout_amount numeric;
BEGIN
  SELECT * INTO v_booking
  FROM service_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

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

  SELECT * INTO v_payout
  FROM provider_payouts
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_payout.status = 'completed' THEN
    UPDATE service_bookings
    SET customer_confirmed = true,
        booking_status = 'payout_completed',
        escrow_status = CASE WHEN escrow_status = 'held' THEN 'released' ELSE escrow_status END,
        escrow_released_at = CASE WHEN escrow_status = 'held' THEN now() ELSE escrow_released_at END
    WHERE id = p_booking_id;

    RETURN jsonb_build_object('success', true, 'payout_amount', v_payout.amount, 'already_released', true);
  END IF;

  IF FOUND THEN
    UPDATE provider_payouts
    SET amount = v_payout_amount,
        platform_fee = v_platform_fee,
        status = 'completed',
        gateway_reference = 'eventhub_wallet_' || p_booking_id::text,
        processed_at = now()
    WHERE id = v_payout.id;
  ELSE
    INSERT INTO provider_payouts (booking_id, provider_id, amount, platform_fee, status, gateway_reference, processed_at)
    VALUES (p_booking_id, v_booking.provider_id, v_payout_amount, v_platform_fee, 'completed', 'eventhub_wallet_' || p_booking_id::text, now());
  END IF;

  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_payout_amount
  WHERE id = v_booking.provider_id;

  UPDATE service_bookings
  SET customer_confirmed = true,
      booking_status = 'payout_completed',
      escrow_status = CASE WHEN escrow_status = 'held' THEN 'released' ELSE escrow_status END,
      escrow_released_at = CASE WHEN escrow_status = 'held' THEN now() ELSE escrow_released_at END
  WHERE id = p_booking_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'provider_payout_completed',
    'booking',
    p_booking_id,
    jsonb_build_object('payout_amount', v_payout_amount, 'platform_fee', v_platform_fee, 'automatic', true)
  );

  RETURN jsonb_build_object('success', true, 'payout_amount', v_payout_amount, 'already_released', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION customer_confirm_completion(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION customer_confirm_completion(uuid) TO authenticated;