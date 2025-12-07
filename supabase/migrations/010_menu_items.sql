-- Migration: Create menu_items table for structured menu storage
-- This replaces the simple image storage with a fully structured, editable menu system

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pizzeria_id UUID REFERENCES pizzerias(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pizza', 'boisson', 'dessert', 'entree', 'accompagnement', 'autre')),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    size TEXT CHECK (size IN ('small', 'medium', 'large', NULL)),
    available BOOLEAN DEFAULT true NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_pizzeria ON menu_items(pizzeria_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(pizzeria_id, category, display_order);

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: Pizzerias can manage their own menu items
CREATE POLICY "Pizzerias can manage their menu items" ON menu_items
    FOR ALL
    USING (pizzeria_id IN (SELECT id FROM pizzerias WHERE user_id = auth.uid()));

-- Policy: Public can read all available menu items
CREATE POLICY "Public can read available menu items" ON menu_items
    FOR SELECT
    USING (available = true);

-- Policy: Authenticated users can read all menu items (for admin/agent access)
CREATE POLICY "Authenticated can read all menu items" ON menu_items
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Add columns to pizzerias table
ALTER TABLE pizzerias 
    ADD COLUMN IF NOT EXISTS menu_image_url TEXT,
    ADD COLUMN IF NOT EXISTS menu_analyzed_at TIMESTAMPTZ;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_menu_items_updated_at_trigger ON menu_items;
CREATE TRIGGER update_menu_items_updated_at_trigger
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_items_updated_at();

-- Create function to get menu for a pizzeria (useful for agent)
CREATE OR REPLACE FUNCTION get_pizzeria_menu(pizzeria_id_input UUID)
RETURNS TABLE (
    category TEXT,
    items JSONB
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        category,
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'name', name,
                'description', description,
                'price', price,
                'size', size,
                'available', available
            ) ORDER BY display_order, name
        ) as items
    FROM menu_items
    WHERE pizzeria_id = pizzeria_id_input
    AND available = true
    GROUP BY category
    ORDER BY 
        CASE category
            WHEN 'pizza' THEN 1
            WHEN 'entree' THEN 2
            WHEN 'accompagnement' THEN 3
            WHEN 'dessert' THEN 4
            WHEN 'boisson' THEN 5
            ELSE 6
        END;
$$;
