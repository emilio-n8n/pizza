
// Configuration Supabase
const SUPABASE_URL = 'https://sjvpewposwmawlyqqbnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdnBld3Bvc3dtYXdseXFxYm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjY3OTMsImV4cCI6MjA3OTI0Mjc5M30.xfzjeSl7vhd3YwlLOFlHHAz1jXxbtJKrO_ylvwOcgHg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = {
    state: {
        session: null,
        pizzeria: null
    },

    init: async () => {
        // Check active session
        const { data: { session } } = await supabase.auth.getSession();
        app.state.session = session;

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            app.state.session = session;
        });

        // Router
        const view = window.location.hash.replace('#', '') || 'home';
        app.navigateTo(view);

        window.addEventListener('hashchange', () => {
            const view = window.location.hash.replace('#', '');
            app.navigateTo(view);
        });
    },

    navigateTo: async (viewId) => {
        // Auth Guard
        if (['onboarding', 'confirmation', 'dashboard', 'call-forwarding'].includes(viewId) && !app.state.session) {
            app.navigateTo('login');
            return;
        }

        // Admin Guard
        if (viewId === 'admin-dashboard') {
            const user = app.state.session?.user;
            if (!user || user.email !== 'emiliomoreau2012@gmail.com') {
                alert('Accès réservé aux administrateurs.');
                app.navigateTo('home');
                return;
            }
        }

        // UI Updates
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');
        window.location.hash = viewId;

        const navbar = document.getElementById('navbar');
        if (['dashboard', 'onboarding', 'admin-dashboard', 'admin-login', 'call-forwarding', 'email-confirm'].includes(viewId)) {
            navbar.style.display = 'none';
        } else {
            navbar.style.display = 'flex';
        }

        // Data Loading
        if (viewId === 'dashboard') await app.loadDashboard();
        if (viewId === 'admin-dashboard') await app.loadAdminDashboard();
        if (viewId === 'call-forwarding') await app.loadCallForwarding();
        if (viewId === 'email-confirm') {
            const email = localStorage.getItem('pendingEmail');
            if (email) {
                document.getElementById('confirm-email-display').innerText = email;
            }
        }
    },

    handleSignup: async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            // Store email for display
            localStorage.setItem('pendingEmail', email);
            app.navigateTo('email-confirm');
        }
    },

    handleEmailConfirmed: async () => {
        // Check if user is actually confirmed
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            app.state.session = session;
            app.navigateTo('onboarding');
        } else {
            alert('Veuillez d\'abord cliquer sur le lien dans votre email avant de continuer.');
        }
    },

    handleLogin: async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        submitBtn.disabled = true;
        submitBtn.innerText = 'Connexion...';

        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert('Erreur: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        } else {
            // Check if they have a pizzeria
            const { data: pizzerias } = await supabase
                .from('pizzerias')
                .select('*')
                .eq('user_id', data.session.user.id)
                .single();

            submitBtn.disabled = false;
            submitBtn.innerText = originalText;

            if (pizzerias) {
                if (pizzerias.status === 'pending') {
                    app.navigateTo('confirmation');
                } else if (pizzerias.status === 'active') {
                    app.navigateTo('call-forwarding');
                } else {
                    app.navigateTo('dashboard');
                }
            } else {
                app.navigateTo('onboarding');
            }
        }
    },

    handleOnboarding: async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        submitBtn.disabled = true;
        submitBtn.innerText = 'Création...';

        const name = document.getElementById('pizzeriaName').value;
        const address = document.getElementById('pizzeriaAddress').value;
        const contactPhone = document.getElementById('pizzeriaContactPhone').value;
        const cuisine = document.getElementById('pizzeriaCuisine').value;
        const user = app.state.session.user;

        const { error } = await supabase
            .from('pizzerias')
            .insert([
                {
                    user_id: user.id,
                    user_email: user.email,
                    name: name,
                    address: address,
                    contact_phone: contactPhone,
                    cuisine: cuisine,
                    status: 'pending'
                }
            ]);

        if (error) {
            alert('Erreur lors de la création: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        } else {
            app.navigateTo('confirmation');
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    },

    handleAdminLogin: async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        submitBtn.disabled = true;
        submitBtn.innerText = 'Connexion...';

        const email = form.querySelector('input[name="adminId"]').value; // Using email input actually
        const password = form.querySelector('input[name="adminPass"]').value;

        // Admin must login as a real user
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert('Erreur: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        } else {
            if (email === 'emiliomoreau2012@gmail.com') {
                app.navigateTo('admin-dashboard');
            } else {
                alert('Vous n\'êtes pas administrateur.');
                supabase.auth.signOut();
            }
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    },

    switchDashboardTab: (tabName) => {
        // Hide all tabs
        document.querySelectorAll('.dashboard-tab').forEach(el => el.style.display = 'none');
        // Show target tab
        const target = document.getElementById(`tab-${tabName}`);
        if (target) target.style.display = 'block';

        // Update menu active state
        document.querySelectorAll('.menu li').forEach(el => el.classList.remove('active'));
        const menu = document.getElementById(`menu-${tabName}`);
        if (menu) menu.classList.add('active');
    },

    loadDashboard: async () => {
        const user = app.state.session?.user;
        if (!user) return;

        const { data: pizzeria, error } = await supabase
            .from('pizzerias')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (pizzeria) {
            document.getElementById('dash-title').innerText = `Commandes - ${pizzeria.name}`;

            // Afficher les infos de contact
            const contactInfo = document.getElementById('pizzeria-contact-info');
            if (contactInfo) {
                contactInfo.innerHTML = `
                    <p><strong>Téléphone de contact:</strong> ${pizzeria.contact_phone || 'Non renseigné'}</p>
                `;
            }

            // Update stats
            if (document.getElementById('total-calls-count')) {
                document.getElementById('total-calls-count').innerText = pizzeria.agent_usage_count || 0;
            }
        }

        // Charger les commandes réelles
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('pizzeria_id', pizzeria.id)
            .order('created_at', { ascending: false });

        if (!ordersError) {
            const ordersList = document.querySelector('.orders-list');
            if (ordersList) {
                if (orders && orders.length > 0) {
                    ordersList.innerHTML = orders.map(order => {
                        const timeAgo = new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        const itemsHtml = Array.isArray(order.items)
                            ? order.items.map(item => `<p>${item.quantity || 1}x ${item.name}</p>`).join('')
                            : '<p>Détails non disponibles</p>';

                        return `
                            <div class="order-card ${order.status === 'new' ? 'new' : ''}">
                                <div class="order-header">
                                    <span class="time">${timeAgo}</span>
                                    <span class="tag ${order.status === 'done' ? 'done' : ''}">${order.status === 'new' ? 'À préparer' : 'Prête'}</span>
                                </div>
                                <div class="order-items">
                                    ${itemsHtml}
                                    ${order.menu ? `<p style="font-style: italic; color: var(--text-muted);">Menu: ${order.menu}</p>` : ''}
                                    ${order.delivery_address ? `<p style="font-size: 0.85rem; color: var(--text-muted);">📍 ${order.delivery_address}</p>` : ''}
                                    ${order.customer_phone ? `<p style="font-size: 0.85rem; color: var(--text-muted);">📞 ${order.customer_phone}</p>` : ''}
                                </div>
                                <div class="order-actions">
                                    <button class="btn-small btn-primary">Valider</button>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    ordersList.innerHTML = '<div class="empty-state">Aucune commande pour le moment.</div>';
                }
            }
        }
    },

    loadAdminDashboard: async () => {
        const list = document.getElementById('admin-pizzeria-list');
        const pendingCount = document.getElementById('admin-pending-count');
        const activeCount = document.getElementById('admin-active-count');

        list.innerHTML = '<p>Chargement...</p>';

        // Fetch all pizzerias (RLS policy allows this for emiliomoreau2012@gmail.com)
        const { data: pizzerias, error } = await supabase
            .from('pizzerias')
            .select('*');

        if (error) {
            list.innerHTML = '<p class="error">Erreur de chargement (Êtes-vous connecté avec emiliomoreau2012@gmail.com ?)</p>';
            return;
        }

        const pending = pizzerias.filter(p => p.status === 'pending');
        const active = pizzerias.filter(p => p.status === 'active');

        pendingCount.innerText = pending.length;
        activeCount.innerText = active.length;

        list.innerHTML = '';
        if (pending.length === 0) {
            list.innerHTML = '<div class="empty-state">Aucune demande en attente.</div>';
            return;
        }

        pending.forEach(p => {
            const card = document.createElement('div');
            card.className = 'pizzeria-card';
            card.innerHTML = `
                <div class="info">
                    <h4>${p.name}</h4>
                    <p><strong>Email:</strong> ${p.user_email || 'Non renseigné'}</p>
                    <p><strong>Téléphone:</strong> ${p.contact_phone || 'Non renseigné'}</p>
                    <p><strong>Adresse:</strong> ${p.address || 'Non renseigné'}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">ID: ${p.id}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button onclick="app.copyWebhookJSON('${p.id}')" class="btn-small btn-secondary">
                        <i class="fa-solid fa-copy"></i> Copier JSON Webhook
                    </button>
                    <button onclick="app.activatePizzeria('${p.id}')" class="btn-small btn-primary">
                        <i class="fa-solid fa-check"></i> Configurer & Activer
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    },

    activatePizzeria: async (pizzeriaId) => {
        const phoneNumber = prompt("Veuillez entrer le numéro de téléphone généré pour cet agent (ex: 0612345678) :");
        if (!phoneNumber) return;

        if (!confirm(`Confirmer l'activation avec le numéro ${phoneNumber} ?`)) return;

        // Get pizzeria details first
        const { data: pizzeria } = await supabase
            .from('pizzerias')
            .select('name, user_id, user_email')
            .eq('id', pizzeriaId)
            .single();

        if (!pizzeria) {
            alert('Erreur: Pizzeria introuvable');
            return;
        }

        // Update status
        const { error } = await supabase
            .from('pizzerias')
            .update({
                status: 'active',
                phone_number: phoneNumber
            })
            .eq('id', pizzeriaId);

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            // Get user email - if not stored, fetch from auth metadata
            let userEmail = pizzeria.user_email;

            if (!userEmail) {
                // Fallback: get email from auth.users via a query
                const { data: userData } = await supabase
                    .from('pizzerias')
                    .select('user_id')
                    .eq('id', pizzeriaId)
                    .single();

                // We need to get the email another way since we can't query auth.users directly
                // Best solution: prompt admin or skip email for old records
                userEmail = prompt("L'email de cette pizzeria n'est pas enregistré. Veuillez l'entrer :");

                if (userEmail) {
                    // Update the pizzeria with the email for future use
                    await supabase
                        .from('pizzerias')
                        .update({ user_email: userEmail })
                        .eq('id', pizzeriaId);
                }
            }

            if (!userEmail) {
                alert('Pizzeria activée, mais aucun email pour envoyer la notification.');
                app.loadAdminDashboard();
                return;
            }

            // Send activation email via Edge Function
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch(`${SUPABASE_URL}/functions/v1/send-activation-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        email: userEmail,
                        pizzeriaName: pizzeria.name,
                        phoneNumber: phoneNumber
                    })
                });

                if (response.ok) {
                    alert('Pizzeria activée ! Email envoyé au client.');
                } else {
                    const errorData = await response.json();
                    console.error('Email error:', errorData);
                    alert('Pizzeria activée, mais l\'email n\'a pas pu être envoyé.');
                }
            } catch (emailError) {
                console.error('Email error:', emailError);
                alert('Pizzeria activée, mais l\'email n\'a pas pu être envoyé.');
            }

            app.loadAdminDashboard();
        }
    },

    copyWebhookJSON: (pizzeriaId) => {
        const webhookConfig = {
            pizzeria_id: pizzeriaId,
            webhook_url: `${SUPABASE_URL}/functions/v1/create-order`,
            example_payload: {
                pizzeria_id: pizzeriaId,
                customer_phone: "0612345678",
                items: [
                    { name: "Pizza Margherita", quantity: 1 },
                    { name: "Coca-Cola", quantity: 1 }
                ],
                menu: "Menu Midi",
                delivery_address: "123 Rue Example, Paris",
                total: 15.50
            }
        };

        navigator.clipboard.writeText(JSON.stringify(webhookConfig, null, 2))
            .then(() => alert('✅ Configuration webhook copiée dans le presse-papier !'))
            .catch(err => {
                console.error('Erreur copie:', err);
                alert('Erreur lors de la copie. Vérifiez la console.');
            });
    },

    loadCallForwarding: async () => {
        const user = app.state.session?.user;
        if (!user) return;

        const { data: pizzeria, error } = await supabase
            .from('pizzerias')
            .select('phone_number')
            .eq('user_id', user.id)
            .single();

        if (pizzeria && pizzeria.phone_number) {
            document.getElementById('agent-phone-number').innerText = pizzeria.phone_number;
            document.querySelectorAll('.agent-number-display').forEach(el => {
                el.innerText = pizzeria.phone_number;
            });
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', app.init);
