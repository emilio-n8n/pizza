
-- Function to get order details for tracking (public access by ID)
CREATE OR REPLACE FUNCTION get_order_tracking(order_id_input UUID)
RETURNS SETOF orders
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM orders WHERE id = order_id_input;
$$;
