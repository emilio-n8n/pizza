
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
        // Log the request for debugging
        console.log('Request method:', req.method);
        console.log('Request headers:', Object.fromEntries(req.headers.entries()));

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let body;
        try {
            const text = await req.text();
            console.log('Request body (raw):', text);
            body = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid JSON in request body');
        }

        const { pizzeria_id, category } = body;
        console.log('Parsed params:', { pizzeria_id, category });

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

        if (error) {
            console.error('Database error:', error);
            throw error;
        }

        console.log('Found menu items:', menuItems?.length || 0);

        // Format menu for agent readability
        const formattedMenu = {};

        // Group by category
        const categories = ['pizza', 'entree', 'boisson', 'dessert', 'accompagnement', 'autre'];

        categories.forEach(cat => {
            const items = menuItems.filter(item => item.category === cat);
            if (items.length > 0) {
                formattedMenu[cat] = items.map(item => {
                    let itemStr = item.name;

                    // Always include description if available
                    if (item.description && item.description.trim()) {
                        itemStr += ` - ${item.description}`;
                    }

                    if (item.size) {
                        itemStr += ` [${item.size}]: ${item.price}€`;
                    } else {
                        itemStr += `: ${item.price}€`;
                    }
                    return itemStr;
                });
            }
        });

        console.log('Formatted menu:', formattedMenu);

        return new Response(
            JSON.stringify(formattedMenu),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in get-menu-for-agent:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
