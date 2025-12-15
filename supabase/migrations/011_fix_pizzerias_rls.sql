-- Fix RLS policies for pizzerias table to allow updates
ALTER TABLE pizzerias ENABLE ROW LEVEL SECURITY;

-- 1. UPDATE Policy
DROP POLICY IF EXISTS "Users can update their own pizzeria" ON pizzerias;
CREATE POLICY "Users can update their own pizzeria"
ON pizzerias FOR UPDATE
USING (auth.uid() = user_id);

-- 2. SELECT Policy (Re-affirming)
DROP POLICY IF EXISTS "Users can view their own pizzeria" ON pizzerias;
CREATE POLICY "Users can view their own pizzeria"
ON pizzerias FOR SELECT
USING (auth.uid() = user_id);

-- 3. INSERT Policy (Re-affirming)
DROP POLICY IF EXISTS "Users can insert their own pizzeria" ON pizzerias;
CREATE POLICY "Users can insert their own pizzeria"
ON pizzerias FOR INSERT
WITH CHECK (auth.uid() = user_id);
