
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let body = {};
        try {
            const text = await req.text();
            if (text) {
                const parsed = JSON.parse(text);
                body = parsed.args || parsed.arguments || parsed;
            }
        } catch { }

        const pizzeria_id = body.pizzeria_id || new URL(req.url).searchParams.get('pizzeria_id');

        if (!pizzeria_id) throw new Error('pizzeria_id is required')

        // Fetch Pizzeria Info
        const { data: pizzeria, error: storeError } = await supabaseClient
            .from('pizzerias')
            .select('*')
            .eq('id', pizzeria_id)
            .single();

        if (storeError) throw storeError;

        // Fetch Menu Items
        const { data: menuItems, error: menuError } = await supabaseClient
            .from('menu_items')
            .select('*')
            .eq('pizzeria_id', pizzeria_id)
            .eq('available', true)
            .order('category');

        if (menuError) throw menuError;

        // Fetch Modifiers
        const { data: modifiers, error: modError } = await supabaseClient
            .from('product_modifiers')
            .select('*')
            .eq('pizzeria_id', pizzeria_id)
            .eq('available', true);

        if (modError) throw modError;

        // Format Menu
        const formattedMenu = {};
        const categories = ['pizza', 'entree', 'boisson', 'dessert', 'accompagnement', 'autre'];
        categories.forEach(cat => {
            const items = menuItems.filter(item => item.category === cat);
            if (items.length > 0) {
                formattedMenu[cat] = items.map(item => {
                    let s = item.name;
                    if (item.description) s += ` (${item.description})`;
                    if (item.size) s += ` [${item.size}]`;
                    s += `: ${item.price}€`;
                    return s;
                });
            }
        });

        const agentContext = {
            restaurant: {
                name: pizzeria.name,
                address: pizzeria.address,
                phone: pizzeria.contact_phone || pizzeria.phone,
                payment_methods: pizzeria.payment_methods,
                preparation_time: `${pizzeria.preparation_time_minutes || 20} min`,
                delivery_rules: pizzeria.delivery_rules,
                special_instructions: pizzeria.custom_instructions
            },
            menu: formattedMenu,
            modifiers: modifiers.map(m => `${m.name} (${m.category}): +${m.price_extra}€`)
        };

        return new Response(JSON.stringify(agentContext), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
