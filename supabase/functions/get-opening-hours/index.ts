
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        const url = new URL(req.url)
        let pizzeria_id = url.searchParams.get('pizzeria_id')

        const bodyText = await req.text()
        if (bodyText) {
            try {
                const body = JSON.parse(bodyText)
                pizzeria_id = pizzeria_id || body.pizzeria_id || body.args?.pizzeria_id || body.arguments?.pizzeria_id
            } catch (e) { }
        }

        if (!pizzeria_id) throw new Error('pizzeria_id is required')

        const { data, error } = await supabase.from('opening_hours').select('*').eq('pizzeria_id', pizzeria_id).order('day_of_week')
        if (error) throw error

        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})
