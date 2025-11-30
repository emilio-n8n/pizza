
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

    menuPhotoBase64: null,
    extractedMenu: [],

    previewMenuPhoto: async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const preview = document.getElementById('menuPhotoPreview');
        const img = document.getElementById('menuPhotoImg');
        const statusDiv = document.getElementById('menuAnalysisStatus');
        const extractedDiv = document.getElementById('menuExtracted');

        // Show preview
        preview.style.display = 'block';
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Convert to base64 and analyze immediately
        const base64Reader = new FileReader();
        base64Reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];
            app.menuPhotoBase64 = base64;

            // Start analysis
            statusDiv.style.display = 'block';
            extractedDiv.style.display = 'none';

            try {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyDNFnTkCLWFDIVVlnmTVxWjvPCZPkOXPqM', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: "Analyse cette photo de menu de pizzeria. Extrais UNIQUEMENT les noms de pizzas et leurs prix. Réponds avec un tableau JSON au format: [{\"name\": \"Pizza Margherita\", \"price\": 12.50}]. Ne retourne rien d'autre que le JSON valide, sans markdown ni texte supplémentaire." },
                                { inline_data: { mime_type: "image/jpeg", data: base64 } }
                            ]
                        }]
                    })
                });

                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    app.extractedMenu = JSON.parse(cleanedText);

                    statusDiv.style.display = 'none';
                    extractedDiv.style.display = 'block';
                    app.renderMenuTable();
                } else {
                    throw new Error('Pas de réponse de Gemini');
                }
            } catch (err) {
                console.error('Menu analysis error:', err);
                statusDiv.innerHTML = '<p style="color: var(--error);">Erreur lors de l\'analyse. Veuillez réessayer.</p>';
            }
        };
        base64Reader.readAsDataURL(file);
    },

    renderMenuTable: () => {
        const tbody = document.getElementById('menuTableBody');
        tbody.innerHTML = app.extractedMenu.map((item, index) => `
            <tr>
                <td style="padding: 0.75rem; border: 1px solid var(--border);">
                    <input type="text" value="${item.name}" onchange="app.updateMenuItem(${index}, 'name', this.value)" 
                           style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px;">
                </td>
                <td style="padding: 0.75rem; border: 1px solid var(--border);">
                    <input type="number" step="0.01" value="${item.price}" onchange="app.updateMenuItem(${index}, 'price', parseFloat(this.value))" 
                           style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px;">
                </td>
                <td style="padding: 0.75rem; border: 1px solid var(--border); text-align: center;">
                    <button type="button" onclick="app.removeMenuItem(${index})" class="btn-small" style="background: var(--error); color: white;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    updateMenuItem: (index, field, value) => {
        app.extractedMenu[index][field] = value;
    },

    removeMenuItem: (index) => {
        app.extractedMenu.splice(index, 1);
        app.renderMenuTable();
    },

    addMenuRow: () => {
        app.extractedMenu.push({ name: '', price: 0 });
        app.renderMenuTable();
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

        const { data: pizzeriaData, error } = await supabase
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
            ])
            .select()
            .single();

        if (error) {
            alert('Erreur: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
            return;
        }

        // Save menu if extracted
        if (app.extractedMenu.length > 0) {
            const { error: menuError } = await supabase
                .from('pizzerias')
                .update({ menu_json: app.extractedMenu })
                .eq('id', pizzeriaData.id);

            if (menuError) {
                console.error('Menu save error:', menuError);
            }
        }

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
        // Populate header
        if (document.getElementById('pizzeria-name-header')) {
            document.getElementById('pizzeria-name-header').innerText = pizzeria.name;
        }
        if (document.getElementById('pizzeria-contact-header')) {
            document.getElementById('pizzeria-contact-header').innerText = `Téléphone de contact: ${pizzeria.contact_phone || 'Non renseigné'}`;
        }

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('pizzeria_id', pizzeria.id)
            .order('created_at', { ascending: false });

        if (!ordersError && orders) {
            // Calculer les stats
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((acc, order) => acc + (Number(order.total_price) || 0), 0);

            // Mettre à jour l'affichage des stats
            if (document.getElementById('stat-orders-count')) {
                document.getElementById('stat-orders-count').innerText = totalOrders;
            }
            if (document.getElementById('stat-revenue')) {
                document.getElementById('stat-revenue').innerText = totalRevenue.toFixed(2) + ' €';
            }
        }

        if (!ordersError) {
            const ordersList = document.getElementById('orders-list') || document.querySelector('.orders-list-dark');
            if (ordersList) {
                if (orders && orders.length > 0) {
                    ordersList.innerHTML = orders.map(order => {
                        const timeAgo = new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        const itemsText = Array.isArray(order.items)
                            ? order.items.map(item => `${item.quantity || 1}x ${item.name}`).join(', ')
                            : 'Détails non disponibles';

                        return `
                            <div class="order-card-dark">
                                <div>
                                    <div class="order-time">${timeAgo}</div>
                                    <div class="order-status-badge">À préparer</div>
                                    <div class="order-items">${itemsText}</div>
                                    <div class="order-details">
                                        ${order.delivery_address ? `<div><i class="fa-solid fa-location-dot"></i>${order.delivery_address}</div>` : ''}
                                        ${order.customer_phone ? `<div><i class="fa-solid fa-phone"></i>${order.customer_phone}</div>` : ''}
                                    </div>
                                </div>
                                <div class="order-actions">
                                    <button class="btn-validate" onclick="app.validateOrder('${order.id}')">Valider</button>
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

    validateOrder: async (orderId) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'done' })
            .eq('id', orderId);

        if (!error) {
            app.loadDashboard(); // Reload to update display
        } else {
            alert('Erreur lors de la validation');
        }
    },

    currentPizzeriaDetail: null,

    loadAdminDashboard: async () => {
        const list = document.getElementById('admin-pizzeria-list');
        const pendingCount = document.getElementById('admin-pending-count');
        const activeCount = document.getElementById('admin-active-count');

        list.innerHTML = '<p>Chargement...</p>';

        // Fetch all pizzerias
        const { data: pizzerias, error } = await supabase
            .from('pizzerias')
            .select('*');

        if (error) {
            list.innerHTML = '<p class="error">Erreur de chargement</p>';
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
            card.className = 'pizzeria-card-compact';
            const createdDate = new Date(p.created_at).toLocaleDateString('fr-FR');
            card.innerHTML = `
                <div class="pizzeria-info">
                    <h3>${p.name}</h3>
                    <span class="date">Inscrit le: ${createdDate}</span>
                </div>
                <button onclick="app.viewPizzeriaDetail('${p.id}')" class="btn-small btn-primary">
                    Voir la pizzeria
                </button>
            `;
            list.appendChild(card);
        });
    },

    viewPizzeriaDetail: async (pizzeriaId) => {
        const { data: pizzeria, error } = await supabase
            .from('pizzerias')
            .select('*')
            .eq('id', pizzeriaId)
            .single();

        if (error || !pizzeria) {
            alert('Erreur lors du chargement des détails');
            return;
        }

        app.currentPizzeriaDetail = pizzeria;

        // Populate modal
        document.getElementById('modal-pizzeria-name').innerText = pizzeria.name;
        document.getElementById('modal-email').innerText = pizzeria.user_email || 'Non renseigné';
        document.getElementById('modal-phone').innerText = pizzeria.contact_phone || 'Non renseigné';
        document.getElementById('modal-address').innerText = pizzeria.address || 'Non renseigné';
        document.getElementById('modal-created').innerText = new Date(pizzeria.created_at).toLocaleDateString('fr-FR');

        // Show menu if available
        const menuSection = document.getElementById('modal-menu-section');
        const menuItems = document.getElementById('modal-menu-items');
        if (pizzeria.menu_json && pizzeria.menu_json.length > 0) {
            menuSection.style.display = 'block';
            menuItems.innerHTML = pizzeria.menu_json.map(item =>
                `<p><strong>${item.name}</strong>: ${item.price}€</p>`
            ).join('');
        } else {
            menuSection.style.display = 'none';
        }

        // Show modal
        document.getElementById('pizzeria-detail-modal').style.display = 'flex';
    },

    closePizzeriaDetail: () => {
        document.getElementById('pizzeria-detail-modal').style.display = 'none';
        app.currentPizzeriaDetail = null;
    },

    copyMenuToClipboard: () => {
        if (!app.currentPizzeriaDetail || !app.currentPizzeriaDetail.menu_json) {
            alert('Aucun menu à copier');
            return;
        }

        const menuText = app.currentPizzeriaDetail.menu_json.map(item =>
            `${item.name}: ${item.price}€`
        ).join('\n');

        navigator.clipboard.writeText(menuText).then(() => {
            alert('Menu copié dans le presse-papier !');
        });
    },

    activatePizzeriaFromModal: async () => {
        if (!app.currentPizzeriaDetail) return;
        await app.activatePizzeria(app.currentPizzeriaDetail.id);
        app.closePizzeriaDetail();
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
