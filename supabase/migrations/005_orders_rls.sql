-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see orders for their own pizzeria
CREATE POLICY "Users can view their own pizzeria orders"
ON orders
FOR SELECT
USING (
  pizzeria_id IN (
    SELECT id FROM pizzerias WHERE user_id = auth.uid()
  )
);

-- Policy: Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access"
ON orders
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Allow inserts from authenticated users for their pizzeria
CREATE POLICY "Users can insert orders for their pizzeria"
ON orders
FOR INSERT
WITH CHECK (
  pizzeria_id IN (
    SELECT id FROM pizzerias WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update orders for their own pizzeria
CREATE POLICY "Users can update their own pizzeria orders"
ON orders
FOR UPDATE
USING (
  pizzeria_id IN (
    SELECT id FROM pizzerias WHERE user_id = auth.uid()
  )
);
