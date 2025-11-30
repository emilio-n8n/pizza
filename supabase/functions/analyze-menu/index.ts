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

        // Log payload size for debugging
        console.log(`Received payload. Image size: ${image_base64 ? image_base64.length : 0} chars`)

        if (!image_base64) {
            return new Response(
                JSON.stringify({ error: 'image_base64 is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check API Key
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is missing from secrets')
            return new Response(
                JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY missing' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('Calling Gemini API...')
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
            console.error('Gemini API error:', geminiResponse.status, errorText)
            return new Response(
                JSON.stringify({
                    error: 'Gemini API Error',
                    status: geminiResponse.status,
                    details: errorText
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const geminiData = await geminiResponse.json()

        // Extraire le texte de la réponse
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) {
            console.error('Empty response from Gemini:', JSON.stringify(geminiData))
            return new Response(
                JSON.stringify({ error: 'No text in Gemini response', raw_response: geminiData }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parser le JSON
        let menuJson
        try {
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            menuJson = JSON.parse(cleanedText)
        } catch (e) {
            console.error('JSON Parse Error:', e.message, 'Text:', text)
            return new Response(
                JSON.stringify({ error: 'Failed to parse Gemini response as JSON', raw_text: text }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Sauvegarder dans la DB si pizzeria_id est fourni
        if (pizzeria_id) {
            const { error: updateError } = await supabaseClient
                .from('pizzerias')
                .update({ menu_json: menuJson })
                .eq('id', pizzeria_id)

            if (updateError) {
                console.error('DB update error:', updateError)
                return new Response(
                    JSON.stringify({ error: 'Failed to save menu to DB', details: updateError.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        return new Response(
            JSON.stringify({ success: true, menu: menuJson }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Unhandled Error:', error)
        return new Response(
            JSON.stringify({
                error: 'Internal Server Error',
                message: error.message,
                stack: error.stack
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
