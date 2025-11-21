import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    try {
        const { email, pizzeriaName, phoneNumber } = await req.json()

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'PizzaVoice AI <onboarding@pizzavoice.com>',
                to: [email],
                subject: `🎉 Votre agent vocal est prêt, ${pizzeriaName} !`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ff5e3a;">Votre agent est configuré !</h1>
            <p>Bonjour,</p>
            <p>Bonne nouvelle ! Votre agent vocal pour <strong>${pizzeriaName}</strong> est maintenant opérationnel.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Prochaine étape :</h2>
              <p>Connectez-vous à votre tableau de bord pour configurer le transfert d'appel.</p>
              <a href="https://votre-site.com#login" style="display: inline-block; background: #ff5e3a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                Accéder au tableau de bord
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Besoin d'aide ? Répondez simplement à cet email.
            </p>
          </div>
        `
            })
        })

        const data = await res.json()
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400
        })
    }
})
