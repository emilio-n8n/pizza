-- Fonction pour incrémenter le compteur d'utilisation
CREATE OR REPLACE FUNCTION increment_usage(pizzeria_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE pizzerias 
  SET agent_usage_count = COALESCE(agent_usage_count, 0) + 1
  WHERE id = pizzeria_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
