
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { pizzeria_id, category } = await req.json()

        if (!pizzeria_id) {
            throw new Error('pizzeria_id is required')
        }

        let query = supabaseClient
            .from('menu_items')
            .select('*')
            .eq('pizzeria_id', pizzeria_id)
            .eq('available', true)
            .order('category', { ascending: true })
            .order('display_order', { ascending: true });

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data: menuItems, error } = await query;

        if (error) throw error;

        // Format menu for agent readability
        const formattedMenu = {};

        // Group by category
        const categories = ['pizza', 'entree', 'boisson', 'dessert', 'accompagnement', 'autre'];

        categories.forEach(cat => {
            const items = menuItems.filter(item => item.category === cat);
            if (items.length > 0) {
                formattedMenu[cat] = items.map(item => {
                    let itemStr = item.name;
                    if (item.description) itemStr += ` (${item.description})`;

                    if (item.size) {
                        // It's a sized item, usually singular in DB for now based on our structure
                        // But if we have multiple entries for same pizza diff sizes, we should ideally group them?
                        // Our current structure has one row per size variation (based on Gemini analysis)
                        // Let's just output it simply: "Margherita (Petite): 10€"
                        itemStr += ` [${item.size}]: ${item.price}€`;
                    } else {
                        itemStr += `: ${item.price}€`;
                    }
                    return itemStr;
                });
            }
        });

        return new Response(
            JSON.stringify(formattedMenu),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
