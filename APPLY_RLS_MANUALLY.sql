-- Script à exécuter manuellement dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/sjvpewposwmawlyqqbnj/sql

-- 1. Vérifier si RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orders';

-- 2. Activer RLS si pas déjà fait
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view their own pizzeria orders" ON orders;
DROP POLICY IF EXISTS "Service role has full access" ON orders;
DROP POLICY IF EXISTS "Users can insert orders for their pizzeria" ON orders;
DROP POLICY IF EXISTS "Users can update their own pizzeria orders" ON orders;

-- 4. Créer les nouvelles policies
CREATE POLICY "Users can view their own pizzeria orders"
ON orders
FOR SELECT
USING (
  pizzeria_id IN (
    SELECT id FROM pizzerias WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role has full access"
ON orders
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can insert orders for their pizzeria"
ON orders
FOR INSERT
WITH CHECK (
  pizzeria_id IN (
    SELECT id FROM pizzerias WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own pizzeria orders"
ON orders
FOR UPDATE
USING (
  pizzeria_id IN (
    SELECT id FROM pizzerias WHERE user_id = auth.uid()
  )
);

-- 5. Vérifier les policies créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'orders';
