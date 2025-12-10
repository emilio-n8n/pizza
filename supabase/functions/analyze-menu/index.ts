import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MenuItem {
    category: 'pizza' | 'boisson' | 'dessert' | 'entree' | 'accompagnement' | 'autre';
    name: string;
    description?: string;
    price: number;
    size?: 'small' | 'medium' | 'large';
}

interface AnalysisResult {
    items: MenuItem[];
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageUrl, imageBase64 } = await req.json();

        if (!imageUrl && !imageBase64) {
            return new Response(
                JSON.stringify({ error: 'Either imageUrl or imageBase64 is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        // Prepare the prompt
        const prompt = `Analyse cette image de menu de pizzeria et extrais toutes les informations en JSON.

Format attendu :
{
  "items": [
    {
      "category": "pizza|boisson|dessert|entree|accompagnement|autre",
      "name": "Nom du produit",
      "description": "Description (optionnel)",
      "price": 12.50,
      "size": "small|medium|large" (pour pizzas uniquement, optionnel)
    }
  ]
}

Règles importantes :
- Extrais TOUS les produits visibles sur le menu
- Convertis les prix en format décimal (ex: "12€" -> 12.00, "12,50€" -> 12.50)
- Identifie correctement les catégories (pizza, boisson, dessert, entree, accompagnement, autre)
- Si plusieurs tailles sont indiquées pour un produit, crée une entrée séparée par taille avec le prix correspondant
- Pour les pizzas, utilise "small", "medium", "large" pour les tailles (ou laisse vide si une seule taille)
- Ignore les éléments décoratifs, logos, et informations non liées aux produits
- Si un prix n'est pas clair, estime-le en fonction du contexte

RÈGLES POUR LES DESCRIPTIONS :
- Si une description est visible sur le menu, extrais-la exactement
- Pour les pizzas classiques SANS description visible, ajoute une description standard basée sur la recette traditionnelle :
  * Margherita : "sauce tomate, mozzarella, basilic"
  * Regina : "sauce tomate, mozzarella, jambon, champignons"
  * Quatre fromages : "mozzarella, gorgonzola, parmesan, chèvre"
  * Napolitaine : "sauce tomate, mozzarella, anchois, câpres, olives"
  * Calzone : "pizza pliée garnie de jambon, mozzarella, champignons"
  * Végétarienne : "sauce tomate, mozzarella, légumes de saison"
  * Hawaïenne : "sauce tomate, mozzarella, jambon, ananas"
  * Pepperoni : "sauce tomate, mozzarella, pepperoni"
- Pour les pizzas avec des noms spéciaux ou créatifs (ex: "Angelo's Special", "Glen Ridge Special") SANS description visible, laisse le champ description vide
- Pour les boissons, entrées, desserts : extrais la description si visible, sinon laisse vide

Retourne UNIQUEMENT le JSON, sans texte supplémentaire.

Réponds uniquement avec le JSON valide.`;

        let result;

        if (imageBase64) {
            // Use base64 image
            const imagePart = {
                inlineData: {
                    data: imageBase64.split(',')[1] || imageBase64, // Remove data:image/... prefix if present
                    mimeType: 'image/jpeg',
                },
            };
            result = await model.generateContent([prompt, imagePart]);
        } else {
            // Fetch image from URL
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();

            // Convert to base64 using proper method to avoid stack overflow
            const bytes = new Uint8Array(imageBuffer);
            let binary = '';
            const chunkSize = 0x8000; // 32KB chunks
            for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64Image = btoa(binary);

            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
                },
            };
            result = await model.generateContent([prompt, imagePart]);
        }

        const response = result.response;
        const text = response.text();

        // Parse the JSON response
        let analysisResult: AnalysisResult;
        try {
            // Try to extract JSON from the response (in case there's extra text)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisResult = JSON.parse(jsonMatch[0]);
            } else {
                analysisResult = JSON.parse(text);
            }
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', text);
            return new Response(
                JSON.stringify({
                    error: 'Failed to parse AI response',
                    details: text,
                    parseError: parseError.message
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate and clean the data
        const validatedItems = analysisResult.items
            .filter(item => item.name && item.price > 0)
            .map((item, index) => ({
                ...item,
                category: item.category || 'autre',
                price: Number(item.price),
                display_order: index,
            }));

        return new Response(
            JSON.stringify({
                success: true,
                items: validatedItems,
                count: validatedItems.length
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error analyzing menu:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to analyze menu',
                details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
