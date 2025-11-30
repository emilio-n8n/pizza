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

        const { image_base64, pizzeria_id } = await req.json()

        if (!image_base64 || !pizzeria_id) {
            return new Response(
                JSON.stringify({ error: 'image_base64 and pizzeria_id are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Appel à Gemini 2.0 Flash
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        if (!GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: "Analyse cette photo de menu de pizzeria. Extrais UNIQUEMENT les noms de pizzas et leurs prix. Réponds avec un tableau JSON au format: [{\"name\": \"Pizza Margherita\", \"price\": 12.50}]. Ne retourne rien d'autre que le JSON valide, sans markdown ni texte supplémentaire."
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: image_base64
                                }
                            }
                        ]
                    }]
                })
            }
        )

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text()
            console.error('Gemini API error:', errorText)
            return new Response(
                JSON.stringify({ error: 'Failed to analyze menu', details: errorText }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const geminiData = await geminiResponse.json()
        console.log('Gemini response:', JSON.stringify(geminiData))

        // Extraire le texte de la réponse
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) {
            return new Response(
                JSON.stringify({ error: 'No text in Gemini response' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parser le JSON (enlever les backticks markdown si présents)
        let menuJson
        try {
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            menuJson = JSON.parse(cleanedText)
        } catch (e) {
            console.error('Failed to parse JSON:', text)
            return new Response(
                JSON.stringify({ error: 'Invalid JSON from Gemini', raw_text: text }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Sauvegarder dans la DB
        const { error: updateError } = await supabaseClient
            .from('pizzerias')
            .update({ menu_json: menuJson })
            .eq('id', pizzeria_id)

        if (updateError) {
            console.error('DB update error:', updateError)
            return new Response(
                JSON.stringify({ error: 'Failed to save menu', details: updateError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ success: true, menu: menuJson }),
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
