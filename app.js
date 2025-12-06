
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

        // Check for driver login
        await app.checkDriverLogin();

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
        // Clear auto-refresh interval if leaving dashboard
        if (app.ordersRefreshInterval) clearInterval(app.ordersRefreshInterval);

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

    menuPhotoFile: null,
    extractedMenu: [],

    previewMenuPhoto: (event) => {
        const file = event.target.files[0];
        if (!file) return;

        app.menuPhotoFile = file;

        const preview = document.getElementById('menuPhotoPreview');
        const img = document.getElementById('menuPhotoImg');
        const statusDiv = document.getElementById('menuAnalysisStatus');
        const extractedDiv = document.getElementById('menuExtracted');

        // Show preview
        preview.style.display = 'block';
        img.style.display = 'block';
        statusDiv.style.display = 'none';
        extractedDiv.style.display = 'none';

        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
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

        // Upload menu photo if provided
        if (app.menuPhotoFile) {
            const fileName = `${pizzeriaData.id}/${Date.now()}_menu.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('menus')
                .upload(fileName, app.menuPhotoFile);

            if (uploadError) {
                console.error('Menu upload error:', uploadError);
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('menus')
                    .getPublicUrl(fileName);

                await supabase
                    .from('pizzerias')
                    .update({ menu_photo_url: publicUrl })
                    .eq('id', pizzeriaData.id);
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

    loadDashboard: async (isRefresh = false) => {
        if (!isRefresh) {
            if (app.ordersRefreshInterval) clearInterval(app.ordersRefreshInterval);
            app.ordersRefreshInterval = setInterval(() => app.loadDashboard(true), 30000);
        }
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

                        let statusBadge = '';
                        let actionButtons = '';
                        const isDelivery = !!order.delivery_address;
                        const status = order.status || 'new';

                        switch (status) {
                            case 'preparing':
                                statusBadge = '<div class="order-status-badge preparing">En préparation</div>';
                                if (isDelivery) {
                                    actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'waiting_delivery')">Prête (Livreur)</button>`;
                                } else {
                                    actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'ready')">Prête (Retrait)</button>`;
                                }
                                break;
                            case 'ready':
                                statusBadge = '<div class="order-status-badge ready">Prête (Retrait)</div>';
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'delivered')">Terminer</button>`;
                                break;
                            case 'waiting_delivery':
                                statusBadge = '<div class="order-status-badge waiting_delivery">Attente Livreur</div>';
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'delivering')">Partie</button>`;
                                break;
                            case 'delivering':
                                statusBadge = '<div class="order-status-badge delivering">En Livraison</div>';
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'delivered')">Livrée</button>`;
                                break;
                            case 'delivered':
                            case 'done':
                                statusBadge = '<div class="order-status-badge delivered">Terminée</div>';
                                actionButtons = '';
                                break;
                            default: // new
                                statusBadge = '<div class="order-status-badge new">Nouvelle</div>';
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'preparing')">Valider</button>`;
                        }

                        return `
                            <div class="order-card-dark">
                                <div>
                                    <div class="order-time">${timeAgo}</div>
                                    ${statusBadge}
                                    <div class="order-items">${itemsText}</div>
                                    <div class="order-details">
                                        ${order.delivery_address ? `<div><i class="fa-solid fa-location-dot"></i>${order.delivery_address}</div>` : ''}
                                        ${order.customer_phone ? `<div><i class="fa-solid fa-phone"></i>${order.customer_phone}</div>` : ''}
                                    </div>
                                </div>
                                <div class="order-actions">
                                    ${actionButtons}
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

    updateOrderStatus: async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (!error) {
            app.loadDashboard(true); // Reload to update display
        } else {
            alert('Erreur lors de la mise à jour');
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
        document.getElementById('modal-id').innerText = pizzeria.id;
        document.getElementById('modal-email').innerText = pizzeria.user_email || 'Non renseigné';
        document.getElementById('modal-phone').innerText = pizzeria.contact_phone || 'Non renseigné';
        document.getElementById('modal-address').innerText = pizzeria.address || 'Non renseigné';
        document.getElementById('modal-created').innerText = new Date(pizzeria.created_at).toLocaleDateString('fr-FR');

        // Show menu photo if available
        const menuPhotoSection = document.getElementById('modal-menu-photo-section');
        const menuPhotoImg = document.getElementById('modal-menu-photo');

        if (pizzeria.menu_photo_url) {
            menuPhotoSection.style.display = 'block';
            menuPhotoImg.src = pizzeria.menu_photo_url;
        } else {
            menuPhotoSection.style.display = 'none';
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
                total: 15.50,
                delivery_address: "123 Rue de la Pizza"
            }
        };
        navigator.clipboard.writeText(JSON.stringify(webhookConfig, null, 2));
        alert('Configuration JSON copiée !');
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
    },

    // --- Driver Management ---

    inviteDriver: async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('newDriverName');
        const name = nameInput.value;
        const user = app.state.session?.user;

        // Get pizzeria ID
        const { data: pizzeria } = await supabase
            .from('pizzerias')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!pizzeria) return;

        const { data, error } = await supabase
            .from('delivery_drivers')
            .insert([{
                pizzeria_id: pizzeria.id,
                name: name
            }])
            .select()
            .single();

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            nameInput.value = '';
            app.loadDriversList(pizzeria.id);
            alert(`Livreur créé ! Lien d'accès : ${window.location.origin}/#driver-login?token=${data.access_token}`);
        }
    },

    loadDriversList: async (pizzeriaId) => {
        if (!pizzeriaId) {
            const user = app.state.session?.user;
            const { data } = await supabase.from('pizzerias').select('id').eq('user_id', user.id).single();
            pizzeriaId = data?.id;
        }

        const { data: drivers } = await supabase
            .from('delivery_drivers')
            .select('*')
            .eq('pizzeria_id', pizzeriaId)
            .order('created_at', { ascending: false });

        const list = document.getElementById('drivers-list');
        if (!drivers || drivers.length === 0) {
            list.innerHTML = '<div class="empty-state-small">Aucun livreur.</div>';
            return;
        }

        list.innerHTML = drivers.map(driver => `
            <div class="driver-item">
                <div class="driver-info">
                    <div class="driver-avatar-small"><i class="fa-solid fa-helmet-safety"></i></div>
                    <div>
                        <div class="driver-name">${driver.name}</div>
                        <div class="driver-status ${driver.is_active ? 'active' : 'inactive'}">
                            ${driver.is_active ? 'Actif' : 'Inactif'}
                        </div>
                    </div>
                </div>
                <div class="driver-actions">
                    <button class="btn-icon" onclick="app.copyDriverLink('${driver.access_token}')" title="Copier le lien">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="btn-icon danger" onclick="app.toggleDriverStatus('${driver.id}', ${driver.is_active})" title="${driver.is_active ? 'Désactiver' : 'Activer'}">
                        <i class="fa-solid fa-${driver.is_active ? 'ban' : 'check'}"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    copyDriverLink: (token) => {
        const link = `${window.location.origin}/#driver-login?token=${token}`;
        navigator.clipboard.writeText(link);
        alert('Lien copié ! Envoyez-le à votre livreur.');
    },

    toggleDriverStatus: async (driverId, currentStatus) => {
        await supabase.from('delivery_drivers').update({ is_active: !currentStatus }).eq('id', driverId);
        app.loadDriversList();
    },

    // --- Driver Dashboard ---

    checkDriverLogin: async () => {
        // Check URL for token
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('driver_token', token);
            window.location.hash = 'driver-dashboard';
        }

        const storedToken = localStorage.getItem('driver_token');
        if (storedToken && window.location.hash === '#driver-dashboard') {
            app.loadDriverDashboard(storedToken);
        }
    },

    loadDriverDashboard: async (token) => {
        app.navigateTo('driver-dashboard');

        // Get driver info
        const { data: drivers, error } = await supabase.rpc('get_driver_by_token', { token_input: token });

        if (error || !drivers || drivers.length === 0) {
            alert('Lien invalide ou expiré.');
            app.logoutDriver();
            return;
        }

        const driver = drivers[0];
        document.getElementById('driver-name').innerText = driver.name;
        app.state.currentDriver = driver;

        app.loadDriverOrders();

        // Auto refresh
        if (app.driverRefreshInterval) clearInterval(app.driverRefreshInterval);
        app.driverRefreshInterval = setInterval(app.loadDriverOrders, 15000);
    },

    loadDriverOrders: async () => {
        const token = localStorage.getItem('driver_token');
        if (!token) return;

        const { data: orders, error } = await supabase.rpc('get_driver_orders', { token_input: token });

        if (error) {
            console.error('Error loading driver orders:', error);
            return;
        }

        const list = document.getElementById('driver-orders-list');
        const activeTab = document.querySelector('.driver-tabs button.active').innerText === 'Disponibles' ? 'available' : 'active';

        const filteredOrders = orders.filter(o => {
            if (activeTab === 'available') return o.status === 'waiting_delivery';
            return o.status === 'delivering' && o.driver_id === app.state.currentDriver.id;
        });

        if (filteredOrders.length === 0) {
            list.innerHTML = '<div class="empty-state">Aucune commande.</div>';
            return;
        }

        list.innerHTML = filteredOrders.map(order => {
            const itemsText = Array.isArray(order.items)
                ? order.items.map(item => `${item.quantity || 1}x ${item.name}`).join(', ')
                : 'Détails non disponibles';

            const addressLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`;

            return `
                <div class="driver-order-card">
                    <div class="driver-order-header">
                        <span class="order-time">${new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="order-price">${order.total_amount} €</span>
                    </div>
                    <div class="driver-order-address">
                        <i class="fa-solid fa-location-dot"></i> ${order.delivery_address}
                    </div>
                    <div class="driver-order-items">${itemsText}</div>
                    
                    <div class="driver-actions-row">
                        ${order.status === 'waiting_delivery' ? `
                            <button class="btn-primary btn-block" onclick="app.driverTakeOrder('${order.id}')">
                                Prendre en charge
                            </button>
                        ` : `
                            <a href="${addressLink}" target="_blank" class="btn-secondary btn-block">
                                <i class="fa-solid fa-diamond-turn-right"></i> GPS
                            </a>
                            <button class="btn-primary btn-block" onclick="app.driverCompleteOrder('${order.id}')">
                                <i class="fa-solid fa-check"></i> Livré
                            </button>
                        `}
                    </div>
                    ${order.customer_phone ? `
                        <a href="tel:${order.customer_phone}" class="driver-call-btn">
                            <i class="fa-solid fa-phone"></i> Appeler client
                        </a>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    switchDriverTab: (tab) => {
        document.querySelectorAll('.driver-tabs button').forEach(b => b.classList.remove('active'));
        // Find button by text content is tricky, better use index or add IDs. 
        // Simple fix: assume order
        const buttons = document.querySelectorAll('.driver-tabs button');
        if (tab === 'available') buttons[0].classList.add('active');
        else buttons[1].classList.add('active');

        app.loadDriverOrders();
    },

    driverTakeOrder: async (orderId) => {
        const token = localStorage.getItem('driver_token');
        const { data, error } = await supabase.rpc('driver_update_order', {
            token_input: token,
            order_id_input: orderId,
            new_status: 'delivering'
        });

        if (error) alert('Erreur: ' + error.message);
        else app.loadDriverOrders();
    },

    driverCompleteOrder: async (orderId) => {
        if (!confirm('Confirmer la livraison ?')) return;

        const token = localStorage.getItem('driver_token');
        const { data, error } = await supabase.rpc('driver_update_order', {
            token_input: token,
            order_id_input: orderId,
            new_status: 'delivered'
        });

        if (error) alert('Erreur: ' + error.message);
        else app.loadDriverOrders();
    },

    logoutDriver: () => {
        localStorage.removeItem('driver_token');
        if (app.driverRefreshInterval) clearInterval(app.driverRefreshInterval);
        app.navigateTo('home');
    },

    // --- Client Tracking ---

    checkTracking: async () => {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const orderId = params.get('order');

        if (orderId) {
            app.navigateTo('tracking');
            app.loadTracking(orderId);

            // Auto refresh
            if (app.trackingRefreshInterval) clearInterval(app.trackingRefreshInterval);
            app.trackingRefreshInterval = setInterval(() => app.loadTracking(orderId), 10000);
        }
    },

    copyToClipboard: (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Numéro copié !');
        }).catch(err => {
            console.error('Erreur copie:', err);
        });
    },

    loadTracking: async (orderId) => {
        // Use anon key for public tracking (requires RLS policy update or function)
        // Since we don't have public RLS for orders, we might need a function or policy.
        // For now, let's try direct select assuming we might need to open it up or use a secure token.
        // Actually, RLS usually blocks this. We should probably use an edge function or a specific RPC.
        // BUT, for simplicity in this MVP, let's assume we can fetch if we have the ID (UUID is hard to guess).
        // We will need to add a policy for this: "Anyone can read order if they know the ID" -> Not possible easily with standard RLS without a "secret" column.
        // Let's use the `get_order_status` RPC we can create.

        const { data: order, error } = await supabase.rpc('get_order_tracking', { order_id_input: orderId });

        if (error || !order || order.length === 0) {
            document.getElementById('tracking-status-text').innerText = "Commande introuvable";
            return;
        }

        const o = order[0];
        document.getElementById('tracking-order-id').innerText = `Commande #${o.id.slice(0, 8)}`;
        document.getElementById('tracking-total').innerText = o.total_amount + ' €';

        // Items
        const itemsList = document.getElementById('tracking-items');
        itemsList.innerHTML = Array.isArray(o.items)
            ? o.items.map(item => `
                <div class="tracking-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)} €</span>
                </div>
            `).join('')
            : '';

        // Status
        const steps = ['new', 'preparing', 'delivering', 'delivered'];
        const currentStepIndex = steps.indexOf(o.status) === -1 ? 0 : steps.indexOf(o.status);

        // Update steps UI
        steps.forEach(step => {
            const el = document.getElementById(`step-${step}`);
            if (el) {
                el.classList.remove('active', 'completed');
                if (steps.indexOf(step) < currentStepIndex) el.classList.add('completed');
                if (steps.indexOf(step) === currentStepIndex) el.classList.add('active');
            }
        });

        // Update Text & Icon
        const statusText = document.getElementById('tracking-status-text');
        const statusDesc = document.getElementById('tracking-status-desc');
        const icon = document.getElementById('tracking-icon');

        switch (o.status) {
            case 'new':
                statusText.innerText = "Commande Reçue";
                statusDesc.innerText = "La pizzeria a reçu votre commande.";
                icon.innerHTML = '<i class="fa-solid fa-receipt"></i>';
                break;
            case 'preparing':
                statusText.innerText = "En Préparation";
                statusDesc.innerText = "Vos pizzas sont au four !";
                icon.innerHTML = '<i class="fa-solid fa-fire-burner"></i>';
                break;
            case 'waiting_delivery':
                statusText.innerText = "Prête";
                statusDesc.innerText = "En attente d'un livreur.";
                icon.innerHTML = '<i class="fa-solid fa-box"></i>';
                break;
            case 'delivering':
                statusText.innerText = "En Livraison";
                statusDesc.innerText = "Le livreur est en route.";
                icon.innerHTML = '<i class="fa-solid fa-motorcycle"></i>';
                break;
            case 'delivered':
                statusText.innerText = "Livrée";
                statusDesc.innerText = "Bon appétit !";
                icon.innerHTML = '<i class="fa-solid fa-face-smile-beam"></i>';
                if (app.trackingRefreshInterval) clearInterval(app.trackingRefreshInterval);
                break;
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    app.checkTracking();
});
