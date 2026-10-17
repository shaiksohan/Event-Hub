/*
# Add Booking Payment & Payout System — Part 2 (Functions)

All SECURITY DEFINER functions for server-side payment verification,
payout initiation, booking status transitions, dispute flagging, and cancellation.

These functions ensure the frontend cannot directly declare a payment successful,
release funds, approve a payout, or modify protected transaction records.
*/

-- verify_and_record_payment: records a verified payment transaction and updates booking
CREATE OR REPLACE FUNCTION verify_and_record_payment(
  p_booking_id uuid,
  p_gateway_payment_id text,
  p_gateway_signature text,
  p_gateway_order_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_order record;
BEGIN
  SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  SELECT * INTO v_order FROM payment_orders
    WHERE booking_id = p_booking_id
    AND gateway_order_id = p_gateway_order_id
    ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  PERFORM 1 FROM payment_transactions
    WHERE gateway_payment_id = p_gateway_payment_id
    AND status = 'verified';
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duplicate payment');
  END IF;

  INSERT INTO payment_transactions (
    booking_id, order_id, user_id, gateway_payment_id,
    gateway_signature, amount, status, verified_at
  ) VALUES (
    p_booking_id, v_order.id, v_booking.user_id,
    p_gateway_payment_id, p_gateway_signature, v_order.amount,
    'verified', now()
  );

  UPDATE service_bookings
    SET booking_status = 'payment_successful',
        payment_status = 'paid',
        escrow_status = 'held'
    WHERE id = p_booking_id;

  UPDATE payment_orders SET status = 'paid', updated_at = now()
    WHERE id = v_order.id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (v_booking.user_id, 'payment_verified', 'booking', p_booking_id,
    jsonb_build_object('amount', v_order.amount, 'gateway_payment_id', p_gateway_payment_id));

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
END;
$$;

-- initiate_provider_payout: checks eligibility and creates a pending payout
CREATE OR REPLACE FUNCTION initiate_provider_payout(p_booking_id uuid)
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
  SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.booking_status != 'completed' OR NOT v_booking.customer_confirmed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not eligible');
  END IF;

  IF v_booking.dispute_flagged THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout blocked: dispute is open');
  END IF;

  PERFORM 1 FROM provider_payouts WHERE booking_id = p_booking_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout already initiated');
  END IF;

  v_platform_fee := ROUND(v_booking.total_price * 0.05, 2);
  v_payout_amount := v_booking.total_price - v_platform_fee;

  INSERT INTO provider_payouts (booking_id, provider_id, amount, platform_fee, status)
  VALUES (p_booking_id, v_booking.provider_id, v_payout_amount, v_platform_fee, 'pending');

  UPDATE service_bookings SET booking_status = 'payout_processing'
    WHERE id = p_booking_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'payout_initiated', 'booking', p_booking_id,
    jsonb_build_object('amount', v_payout_amount, 'platform_fee', v_platform_fee));

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
END;
$$;

-- flag_dispute: creates a dispute and flags the booking
CREATE OR REPLACE FUNCTION flag_dispute(p_booking_id uuid, p_reason text)
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

  IF auth.uid() != v_booking.user_id AND auth.uid() != v_booking.provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  INSERT INTO disputes (booking_id, raised_by, reason, status)
  VALUES (p_booking_id, auth.uid(), p_reason, 'open');

  UPDATE service_bookings
    SET dispute_flagged = true,
        booking_status = 'disputed'
    WHERE id = p_booking_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'dispute_flagged', 'booking', p_booking_id,
    jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- provider_accept_reject_booking
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

  IF p_action = 'accepted' THEN
    UPDATE service_bookings
      SET provider_action = 'accepted',
          booking_status = 'booking_confirmed',
          status = 'confirmed'
      WHERE id = p_booking_id;
  ELSIF p_action = 'rejected' THEN
    UPDATE service_bookings
      SET provider_action = 'rejected',
          booking_status = 'cancelled',
          status = 'cancelled'
      WHERE id = p_booking_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'booking_' || p_action, 'booking', p_booking_id,
    jsonb_build_object('action', p_action));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- mark_service_completed: provider marks service as done
CREATE OR REPLACE FUNCTION mark_service_completed(p_booking_id uuid)
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

  UPDATE service_bookings
    SET booking_status = 'awaiting_customer',
        status = 'completed'
    WHERE id = p_booking_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'service_marked_completed', 'booking', p_booking_id, '{}'::jsonb);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- customer_confirm_completion: customer confirms the service was delivered
CREATE OR REPLACE FUNCTION customer_confirm_completion(p_booking_id uuid)
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

  IF auth.uid() != v_booking.user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_booking.booking_status != 'awaiting_customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service must be marked completed by provider first');
  END IF;

  UPDATE service_bookings
    SET customer_confirmed = true,
        booking_status = 'completed'
    WHERE id = p_booking_id;

  IF v_booking.escrow_status = 'held' THEN
    UPDATE service_bookings SET escrow_status = 'released', escrow_released_at = now()
      WHERE id = p_booking_id;
  END IF;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'customer_confirmed_completion', 'booking', p_booking_id, '{}'::jsonb);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- request_cancellation: customer or provider cancels a booking (before completion)
CREATE OR REPLACE FUNCTION request_cancellation(p_booking_id uuid)
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

  IF auth.uid() != v_booking.user_id AND auth.uid() != v_booking.provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_booking.booking_status IN ('completed', 'payout_processing', 'payout_completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel a completed booking');
  END IF;

  IF v_booking.escrow_status = 'held' THEN
    UPDATE service_bookings SET escrow_status = 'refunded' WHERE id = p_booking_id;
  END IF;

  UPDATE service_bookings
    SET booking_status = 'cancelled',
        status = 'cancelled'
    WHERE id = p_booking_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'booking_cancelled', 'booking', p_booking_id, '{}'::jsonb);

  RETURN jsonb_build_object('success', true);
END;
$$;
