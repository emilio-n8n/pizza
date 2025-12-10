import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import * as cheerio from "npm:cheerio@1.0.0-rc.12"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { url } = await req.json()

        if (!url) {
            throw new Error('URL is required')
        }

        console.log('Scraping URL:', url)

        // 1. Fetch the webpage
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PizzaVoiceBot/1.0)'
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()
        console.log('HTML fetched, length:', html.length)

        // 2. Parse HTML and extract menu content
        const $ = cheerio.load(html)

        // Remove scripts, styles, nav, footer, header
        $('script, style, nav, footer, header, .nav, .footer, .header').remove()

        // Extract text from body
        let menuText = $('body').text()

        // Clean up whitespace
        menuText = menuText.replace(/\s+/g, ' ').trim()

        // Limit to 10000 characters to avoid token limits
        if (menuText.length > 10000) {
            menuText = menuText.substring(0, 10000)
        }

        console.log('Extracted text length:', menuText.length)

        if (menuText.length < 50) {
            throw new Error('Not enough text extracted from the page. The page might be empty or use JavaScript to load content.')
        }

        // 3. Send to Gemini for structuring
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

        const prompt = `Analyse ce texte extrait d'un site web de pizzeria et extrais le menu en JSON.

Texte du site :
${menuText}

Format attendu :
{
  "items": [
    {
      "category": "pizza|boisson|dessert|entree|accompagnement|autre",
      "name": "Nom du produit",
      "description": "Description",
      "price": 12.50,
      "size": "small|medium|large" (optionnel)
    }
  ]
}

Règles importantes :
- Extrais TOUS les produits avec leurs prix
- Convertis les prix en format décimal (ex: "12€" -> 12.00, "12,50€" -> 12.50)
- Identifie correctement les catégories (pizza, boisson, dessert, entree, accompagnement, autre)
- Si plusieurs tailles sont indiquées pour un produit, crée une entrée séparée par taille avec le prix correspondant
- Pour les pizzas, utilise "small", "medium", "large" pour les tailles (ou laisse vide si une seule taille)

RÈGLES POUR LES DESCRIPTIONS :
- Si une description est visible, extrais-la exactement
- Pour les pizzas classiques SANS description visible, ajoute une description standard basée sur la recette traditionnelle :
  * Margherita : "sauce tomate, mozzarella, basilic"
  * Regina : "sauce tomate, mozzarella, jambon, champignons"
  * Quatre fromages : "mozzarella, gorgonzola, parmesan, chèvre"
  * Napolitaine : "sauce tomate, mozzarella, anchois, câpres, olives"
  * Calzone : "pizza pliée garnie de jambon, mozzarella, champignons"
  * Végétarienne : "sauce tomate, mozzarella, légumes de saison"
  * Hawaïenne : "sauce tomate, mozzarella, jambon, ananas"
  * Pepperoni : "sauce tomate, mozzarella, pepperoni"
- Pour les pizzas avec des noms spéciaux ou créatifs SANS description visible, laisse le champ description vide
- Pour les boissons, entrées, desserts : extrais la description si visible, sinon laisse vide

Ignore les éléments non-menu (horaires, contact, adresse, etc.)

Retourne UNIQUEMENT le JSON valide.`

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        console.log('Gemini response length:', text.length)

        // 4. Parse JSON response
        let analysisResult: AnalysisResult
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                analysisResult = JSON.parse(jsonMatch[0])
            } else {
                analysisResult = JSON.parse(text)
            }
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', text)
            throw new Error('Failed to parse AI response')
        }

        // 5. Validate and return
        const validatedItems = analysisResult.items
            .filter(item => item.name && item.price > 0)
            .map((item, index) => ({
                ...item,
                category: item.category || 'autre',
                price: Number(item.price),
                display_order: index,
            }))

        console.log('Validated items count:', validatedItems.length)

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
        )

    } catch (error) {
        console.error('Error scraping menu:', error)
        return new Response(
            JSON.stringify({
                error: 'Failed to scrape menu',
                details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
