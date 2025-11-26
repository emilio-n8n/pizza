-- Ajouter colonnes à pizzerias
ALTER TABLE pizzerias ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE pizzerias ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE pizzerias ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE pizzerias ADD COLUMN IF NOT EXISTS agent_usage_count INTEGER DEFAULT 0;

-- Créer table orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pizzeria_id UUID REFERENCES pizzerias(id) ON DELETE CASCADE,
  customer_phone TEXT,
  items JSONB,
  menu TEXT,
  delivery_address TEXT,
  total_price NUMERIC,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Créer table agent_logs (pour analytics avancés)
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pizzeria_id UUID REFERENCES pizzerias(id) ON DELETE CASCADE,
  call_duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_orders_pizzeria ON orders(pizzeria_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_pizzeria ON agent_logs(pizzeria_id);

-- RLS Policies pour orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Les pizzerias peuvent voir leurs propres commandes
CREATE POLICY "Pizzerias can view own orders"
  ON orders FOR SELECT
  USING (
    pizzeria_id IN (
      SELECT id FROM pizzerias WHERE user_id = auth.uid()
    )
  );

-- L'admin peut tout voir
CREATE POLICY "Admin can view all orders"
  ON orders FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'emiliomoreau2012@gmail.com'
  );

-- Le webhook peut insérer (via service role key)
CREATE POLICY "Service can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);
