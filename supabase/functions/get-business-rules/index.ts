
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { pizzeria_id } = await req.json()
        if (!pizzeria_id) throw new Error('pizzeria_id is required')

        const { data: pizzeria, error } = await supabase
            .from('pizzerias')
            .select(`
            payment_methods,
            preparation_time_minutes,
            free_delivery_threshold,
            custom_instructions,
            kitchen_load_status
        `)
            .eq('id', pizzeria_id)
            .single()

        if (error) throw error

        return new Response(
            JSON.stringify(pizzeria),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
