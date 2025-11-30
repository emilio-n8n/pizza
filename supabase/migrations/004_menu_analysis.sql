-- Ajouter colonnes pour le menu analysé par IA
ALTER TABLE pizzerias 
ADD COLUMN IF NOT EXISTS menu_photo_url TEXT,
ADD COLUMN IF NOT EXISTS menu_json JSONB;
