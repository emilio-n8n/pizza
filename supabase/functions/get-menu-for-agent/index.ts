
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

        // 1. Fetch Basic Pizzeria Info & Rules
        const { data: pizzeria, error: storeError } = await supabaseClient
            .from('pizzerias')
            .select('*')
            .eq('id', pizzeria_id)
            .single();

        if (storeError) throw storeError;

        // 2. Fetch Opening Hours
        const { data: hours, error: hoursError } = await supabaseClient
            .from('opening_hours')
            .select('*')
            .eq('pizzeria_id', pizzeria_id)
            .order('day_of_week');

        if (hoursError) throw hoursError;

        // 3. Fetch Delivery Zones
        const { data: zones, error: zonesError } = await supabaseClient
            .from('delivery_zones')
            .select('*')
            .eq('pizzeria_id', pizzeria_id);

        if (zonesError) throw zonesError;

        // 4. Fetch Menu Items (Enhanced with availability check)
        let menuQuery = supabaseClient
            .from('menu_items')
            .select('*')
            .eq('pizzeria_id', pizzeria_id)
            .eq('available', true)
            .order('category', { ascending: true })
            .order('display_order', { ascending: true });

        if (category && category !== 'all') {
            menuQuery = menuQuery.eq('category', category);
        }

        const { data: menuItems, error: menuError } = await menuQuery;

        if (menuError) {
            console.error('Database error:', menuError);
            throw menuError;
        }

        // 5. Fetch Modifiers
        const { data: modifiers, error: modError } = await supabaseClient
            .from('product_modifiers')
            .select('*')
            .eq('pizzeria_id', pizzeria_id)
            .eq('available', true);

        if (modError) throw modError;


        // --- Format Response for Agent ---

        // Format Hours
        const daysMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const formattedHours = hours.map(h => {
            if (h.is_closed) return `${daysMap[h.day_of_week]}: Fermé`;
            return `${daysMap[h.day_of_week]}: ${h.open_time.slice(0, 5)} - ${h.close_time.slice(0, 5)}`;
        });

        // Format Zones
        const formattedZones = zones.map(z =>
            `${z.postal_code} (${z.city_name || ''}) - Min: ${z.min_order_amount}€, Frais: ${z.delivery_fee}€`
        );

        // Format Menu
        const formattedMenu = {};
        const categories = ['pizza', 'entree', 'boisson', 'dessert', 'accompagnement', 'autre'];
        categories.forEach(cat => {
            const items = menuItems.filter(item => item.category === cat);
            if (items.length > 0) {
                formattedMenu[cat] = items.map(item => {
                    let itemStr = item.name;
                    if (item.description && item.description.trim()) itemStr += ` (${item.description})`;
                    if (item.size) itemStr += ` [${item.size}]`;
                    itemStr += `: ${item.price}€`;
                    return itemStr;
                });
            }
        });

        // Construct Final Payload
        const agentContext = {
            restaurant: {
                name: pizzeria.name,
                phone: pizzeria.phone,
                address: pizzeria.address,
                payment_methods: pizzeria.payment_methods,
                preparation_time: pizzeria.preparation_time_minutes + " min",
                kitchen_status: pizzeria.kitchen_load_status, // normal, busy, fire
                special_instructions: pizzeria.custom_instructions
            },
            opening_hours: formattedHours,
            delivery_zones: formattedZones,
            menu: formattedMenu,
            modifiers: modifiers.map(m => `${m.name} (${m.category}): +${m.price_extra}€`),
            rules: {
                free_delivery_above: pizzeria.free_delivery_threshold ? `${pizzeria.free_delivery_threshold}€` : "Non",
                min_delivery_order: pizzeria.min_order_delivery ? `${pizzeria.min_order_delivery}€` : "0€"
            }
        };

        console.log('Returning rich context to agent');

        return new Response(
            JSON.stringify(agentContext),
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
