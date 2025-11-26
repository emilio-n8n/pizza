import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { pizzeria_id, customer_phone, items, menu, delivery_address, total } = await req.json()

        // Validation
        if (!pizzeria_id) {
            return new Response(
                JSON.stringify({ error: 'pizzeria_id is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Vérifier que la pizzeria existe
        const { data: pizzeria, error: pizzeriaError } = await supabaseClient
            .from('pizzerias')
            .select('id, name')
            .eq('id', pizzeria_id)
            .single()

        if (pizzeriaError || !pizzeria) {
            return new Response(
                JSON.stringify({ error: 'Pizzeria not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Créer la commande
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .insert({
                pizzeria_id,
                customer_phone,
                items,
                menu,
                delivery_address,
                total_price: total,
                status: 'new'
            })
            .select()
            .single()

        if (orderError) {
            console.error('Order creation error:', orderError)
            return new Response(
                JSON.stringify({ error: 'Failed to create order', details: orderError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Incrémenter le compteur d'utilisation
        const { error: updateError } = await supabaseClient.rpc('increment_usage', {
            pizzeria_uuid: pizzeria_id
        })

        if (updateError) {
            console.error('Usage count update error:', updateError)
            // Non-bloquant, on continue
        }

        return new Response(
            JSON.stringify({
                success: true,
                order_id: order.id,
                message: `Order created for ${pizzeria.name}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
