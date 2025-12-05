
-- Create delivery_drivers table
CREATE TABLE IF NOT EXISTS delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pizzeria_id UUID REFERENCES pizzerias(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Add driver_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES delivery_drivers(id);

-- Enable RLS
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;

-- Policy for Pizzeria Owners
CREATE POLICY "Pizzerias can manage their drivers" ON delivery_drivers
    FOR ALL
    USING (pizzeria_id IN (SELECT id FROM pizzerias WHERE user_id = auth.uid()));

-- Function to get driver by token (for driver dashboard)
CREATE OR REPLACE FUNCTION get_driver_by_token(token_input TEXT)
RETURNS SETOF delivery_drivers
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM delivery_drivers WHERE access_token = token_input;
$$;

-- Function for driver to update order
CREATE OR REPLACE FUNCTION driver_update_order(token_input TEXT, order_id_input UUID, new_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_record delivery_drivers%ROWTYPE;
BEGIN
  -- Verify token
  SELECT * INTO driver_record FROM delivery_drivers WHERE access_token = token_input;
  
  IF driver_record.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update order
  -- If taking charge (waiting_delivery -> delivering), set driver_id
  IF new_status = 'delivering' THEN
      UPDATE orders 
      SET status = new_status,
          driver_id = driver_record.id
      WHERE id = order_id_input 
      AND pizzeria_id = driver_record.pizzeria_id
      AND status = 'waiting_delivery'; -- Prevent race conditions
      
      RETURN FOUND;
  ELSE
      -- Just update status (e.g. to delivered)
      UPDATE orders 
      SET status = new_status
      WHERE id = order_id_input 
      AND pizzeria_id = driver_record.pizzeria_id
      AND driver_id = driver_record.id;
      
      RETURN FOUND;
  END IF;
END;
$$;

-- Function to get orders for driver
CREATE OR REPLACE FUNCTION get_driver_orders(token_input TEXT)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_record delivery_drivers%ROWTYPE;
BEGIN
  SELECT * INTO driver_record FROM delivery_drivers WHERE access_token = token_input;
  
  IF driver_record.id IS NULL THEN
    RETURN;
  END IF;

  -- Return orders that are waiting for delivery (for this pizzeria) OR assigned to this driver
  RETURN QUERY SELECT * FROM orders 
  WHERE pizzeria_id = driver_record.pizzeria_id
  AND (
      status = 'waiting_delivery' 
      OR 
      (driver_id = driver_record.id AND status = 'delivering')
  )
  ORDER BY created_at DESC;
END;
$$;
