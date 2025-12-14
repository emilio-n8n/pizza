
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
        if (['dashboard', 'onboarding', 'admin-dashboard', 'admin-login', 'call-forwarding', 'email-confirm', 'tracking'].includes(viewId)) {
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

        // Create pizzeria first
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

        // Store pizzeria ID for later use
        app.currentPizzeriaId = pizzeriaData.id;

        // Check which source is selected
        const menuUrl = document.getElementById('menuUrlInput')?.value?.trim();

        // Handle URL scraping
        if (menuUrl) {
            submitBtn.innerText = 'Analyse du site web...';

            try {
                const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('scrape-menu-from-url', {
                    body: { url: menuUrl }
                });

                if (analysisError) throw analysisError;

                if (analysisResult && analysisResult.items && analysisResult.items.length > 0) {
                    // Show menu editor with analyzed items
                    app.tempMenuItems = analysisResult.items;
                    app.showMenuEditor();
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                } else {
                    // No items found, continue without menu
                    alert('Aucun produit détecté sur le site. Vous pourrez ajouter le menu manuellement plus tard.');
                    app.navigateTo('confirmation');
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                }
            } catch (analysisError) {
                console.error('Menu scraping error:', analysisError);
                alert('Erreur lors de l\'analyse du site. Vous pourrez ajouter le menu manuellement plus tard.');
                app.navigateTo('confirmation');
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        }
        // Handle image upload
        else if (app.menuPhotoFile) {
            submitBtn.innerText = 'Upload du menu...';

            const fileName = `${pizzeriaData.id}/${Date.now()}_menu.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('menus')
                .upload(fileName, app.menuPhotoFile);

            if (uploadError) {
                console.error('Menu upload error:', uploadError);
                alert('Erreur lors de l\'upload du menu. Vous pourrez l\'ajouter plus tard.');
                app.navigateTo('confirmation');
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('menus')
                .getPublicUrl(fileName);

            // Update pizzeria with menu URL
            await supabase
                .from('pizzerias')
                .update({ menu_image_url: publicUrl })
                .eq('id', pizzeriaData.id);

            // Analyze menu with Gemini
            submitBtn.innerText = 'Analyse du menu par IA...';

            try {
                const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-menu', {
                    body: { imageUrl: publicUrl }
                });

                if (analysisError) throw analysisError;

                if (analysisResult && analysisResult.items && analysisResult.items.length > 0) {
                    // Show menu editor with analyzed items
                    app.tempMenuItems = analysisResult.items;
                    app.showMenuEditor();
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                } else {
                    // No items found, continue without menu
                    alert('Aucun produit détecté dans le menu. Vous pourrez l\'ajouter manuellement plus tard.');
                    app.navigateTo('confirmation');
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                }
            } catch (analysisError) {
                console.error('Menu analysis error:', analysisError);
                alert('Erreur lors de l\'analyse du menu. Vous pourrez l\'ajouter manuellement plus tard.');
                app.navigateTo('confirmation');
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        } else {
            // No menu provided, continue
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

        // Load drivers list when opening settings tab
        if (tabName === 'settings') {
            app.loadDriversList();
        }

        // Load menu when opening menu tab
        if (tabName === 'menu') {
            app.loadMenuManagement();
        }
    },

    // --- Menu Management (Settings) Functions ---

    loadMenuManagement: async () => {
        const list = document.getElementById('menu-management-list');
        if (!list) return;

        list.innerHTML = '<div class="empty-state">Chargement du menu...</div>';

        let pizzeriaId = app.currentPizzeriaId;
        if (!pizzeriaId) {
            const user = app.state.session?.user;
            if (user) {
                const { data } = await supabase.from('pizzerias').select('id').eq('user_id', user.id).single();
                pizzeriaId = data?.id;
                app.currentPizzeriaId = pizzeriaId;
            }
        }

        if (!pizzeriaId) {
            list.innerHTML = '<div class="error-state">Erreur: Pizzeria non trouvée.</div>';
            return;
        }

        const { data: menuItems, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('pizzeria_id', pizzeriaId)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error loading menu:', error);
            list.innerHTML = `<div class="error-state">Erreur lors du chargement du menu: ${error.message}</div>`;
            return;
        }

        app.menuItemsCache = menuItems || [];
        app.activeMenuCategory = 'all';
        app.renderMenuManagementList();
    },

    filterMenuCategory: (category) => {
        app.activeMenuCategory = category;

        // Update tabs styling
        document.querySelectorAll('.category-tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.innerText.toLowerCase().includes(category === 'all' ? 'tout' : category)) {
                // Approximate matching or logic based on onclick attr parsing could be brittle, 
                // simpler to assume onclick logic sets class.
                // Re-selecting by onclick attribute content is robust enough here.
                if (btn.getAttribute('onclick').includes(`'${category}'`)) {
                    btn.classList.add('active');
                }
            }
        });

        app.renderMenuManagementList();
    },

    renderMenuManagementList: () => {
        const list = document.getElementById('menu-management-list');
        if (!list) return;

        const category = app.activeMenuCategory || 'all';
        let items = app.menuItemsCache || [];

        if (category !== 'all') {
            items = items.filter(item => item.category === category);
        }

        if (items.length === 0) {
            list.innerHTML = '<div class="empty-state">Aucun produit dans cette catégorie.</div>';
            return;
        }

        list.innerHTML = items.map(item => `
            <div class="menu-item-row-card">
                <div class="menu-item-details">
                    <div class="item-header">
                        <span class="item-name" contenteditable="true" onblur="app.updateMenuItemInDB('${item.id}', 'name', this.innerText)">${item.name}</span>
                        <span class="item-price">
                            <input type="number" step="0.01" value="${item.price}" onchange="app.updateMenuItemInDB('${item.id}', 'price', this.value)"> €
                        </span>
                    </div>
                    <div class="item-desc" contenteditable="true" onblur="app.updateMenuItemInDB('${item.id}', 'description', this.innerText)">${item.description || 'Ajouter une description...'}</div>
                    <div class="item-meta">
                        <select onchange="app.updateMenuItemInDB('${item.id}', 'category', this.value)" class="small-select">
                            <option value="pizza" ${item.category === 'pizza' ? 'selected' : ''}>Pizza</option>
                            <option value="boisson" ${item.category === 'boisson' ? 'selected' : ''}>Boisson</option>
                            <option value="dessert" ${item.category === 'dessert' ? 'selected' : ''}>Dessert</option>
                            <option value="entree" ${item.category === 'entree' ? 'selected' : ''}>Entrée</option>
                            <option value="accompagnement" ${item.category === 'accompagnement' ? 'selected' : ''}>Accompagnement</option>
                            <option value="autre" ${item.category === 'autre' ? 'selected' : ''}>Autre</option>
                        </select>
                        ${item.category === 'pizza' ? `
                            <select onchange="app.updateMenuItemInDB('${item.id}', 'size', this.value)" class="small-select">
                                <option value="" ${!item.size ? 'selected' : ''}>Taille: -</option>
                                <option value="small" ${item.size === 'small' ? 'selected' : ''}>Petite</option>
                                <option value="medium" ${item.size === 'medium' ? 'selected' : ''}>Moyenne</option>
                                <option value="large" ${item.size === 'large' ? 'selected' : ''}>Grande</option>
                            </select>
                        ` : ''}
                        <label class="toggle-switch">
                            <input type="checkbox" ${item.available ? 'checked' : ''} onchange="app.updateMenuItemInDB('${item.id}', 'available', this.checked)">
                            <span class="slider round"></span>
                        </label>
                        <span class="availability-label">${item.available ? 'Disponible' : 'Indisponible'}</span>
                    </div>
                </div>
                <button class="btn-icon danger" onclick="app.deleteMenuItemFromDB('${item.id}')" title="Supprimer">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join('');
    },

    addMenuItemToDB: async () => {
        if (!app.currentPizzeriaId) return;

        const newItem = {
            pizzeria_id: app.currentPizzeriaId,
            category: app.activeMenuCategory === 'all' ? 'pizza' : app.activeMenuCategory,
            name: 'Nouveau produit',
            description: '',
            price: 10,
            available: true
        };

        const { data, error } = await supabase.from('menu_items').insert([newItem]).select().single();

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            if (app.menuItemsCache) app.menuItemsCache.push(data);
            app.renderMenuManagementList();
        }
    },

    updateMenuItemInDB: async (id, field, value) => {
        // Optimistic update
        const itemIndex = app.menuItemsCache.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            app.menuItemsCache[itemIndex][field] = value;
            if (field === 'available') app.renderMenuManagementList(); // Re-render to update label text
        }

        const updateData = {};
        updateData[field] = value;

        const { error } = await supabase.from('menu_items').update(updateData).eq('id', id);

        if (error) {
            console.error('Update error:', error);
            // Revert optimistic update if needed? For now just log.
        }
    },

    deleteMenuItemFromDB: async (id) => {
        if (!confirm('Supprimer définitivement ce produit ?')) return;

        // Optimistic delete
        app.menuItemsCache = app.menuItemsCache.filter(i => i.id !== id);
        app.renderMenuManagementList();

        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) {
            alert('Erreur: ' + error.message);
            app.loadMenuManagement(); // Reload on error
        }
    },

    loadDashboard: async (isRefresh = false) => {
        if (!isRefresh) {
            if (app.ordersRefreshInterval) clearInterval(app.ordersRefreshInterval);
            app.ordersRefreshInterval = setInterval(() => app.loadDashboard(true), 30000);
        }
        const user = app.state.session?.user;
        if (!user) {
            console.error('No user session found');
            return;
        }

        const { data: pizzeria, error } = await supabase
            .from('pizzerias')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('Error loading pizzeria:', error);
            // If no pizzeria found (PGRST116), redirect to onboarding
            if (error.code === 'PGRST116') {
                console.log('No pizzeria found, redirecting to onboarding');
                app.navigateTo('onboarding');
                return;
            }
            // For other errors (like 406), show error but don't redirect
            console.error('Database error, but not redirecting:', error);
            alert('Erreur de chargement. Veuillez rafraîchir la page.');
            return;
        }

        if (!pizzeria) {
            console.error('Pizzeria is null but no error');
            app.navigateTo('onboarding');
            return;
        }

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
                // Determine active tab status
                const activeTabBtn = document.querySelector('.pizzeria-tab-btn.active');
                const activeStatus = activeTabBtn ? activeTabBtn.id.replace('tab-btn-', '') : 'new';

                // Filter orders by active status
                const filteredOrders = orders && orders.filter(order => {
                    const status = order.status || 'new';
                    return status === activeStatus;
                });

                if (filteredOrders && filteredOrders.length > 0) {
                    ordersList.innerHTML = filteredOrders.map(order => {
                        const timeAgo = new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        const itemsText = Array.isArray(order.items)
                            ? order.items.map(item => `${item.quantity || 1}x ${item.name}`).join(', ')
                            : 'Détails non disponibles';

                        let actionButtons = '';
                        const isDelivery = !!order.delivery_address;
                        const status = order.status || 'new';

                        switch (status) {
                            case 'preparing':
                                if (isDelivery) {
                                    actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'waiting_delivery')">Prête (Livreur)</button>`;
                                } else {
                                    actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'ready')">Prête (Retrait)</button>`;
                                }
                                break;
                            case 'ready':
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'delivered')">Terminer</button>`;
                                break;
                            case 'waiting_delivery':
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'delivering')">Partie</button>`;
                                break;
                            case 'delivering':
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'delivered')">Livrée</button>`;
                                break;
                            case 'delivered':
                            case 'done':
                                actionButtons = '';
                                break;
                            default: // new
                                actionButtons = `<button class="btn-validate" onclick="app.updateOrderStatus('${order.id}', 'preparing')">Valider</button>`;
                        }

                        return `
                            <div class="order-card-dark">
                                <div>
                                    <div class="order-time">${timeAgo}</div>
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

    switchPizzeriaOrdersTab: (status) => {
        document.querySelectorAll('.pizzeria-tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-btn-${status}`).classList.add('active');
        app.loadDashboard(true);
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
        const nameInput = document.getElementById('driver-name-input');
        const phoneInput = document.getElementById('driver-phone-input');
        const name = nameInput.value;
        const phone = phoneInput.value;
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
                name: name,
                phone: phone || null
            }])
            .select()
            .single();

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            nameInput.value = '';
            phoneInput.value = '';
            app.loadDriversList(pizzeria.id);

            // Show link with copy button
            const link = `${window.location.origin}/#driver-login?token=${data.access_token}`;
            const message = `Livreur créé !\n\nLien d'accès :\n${link}\n\nPartagez ce lien avec ${name}.`;
            alert(message);
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
        const activeTab = document.querySelector('.driver-tab-btn.active').id === 'tab-btn-available' ? 'available' : 'active';

        const filteredOrders = orders.filter(o => {
            if (activeTab === 'available') return o.status === 'waiting_delivery';
            return o.status === 'delivering' && o.driver_id === app.state.currentDriver.id;
        });

        if (filteredOrders.length === 0) {
            list.innerHTML = `
                <div class="empty-state-dark">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; color: #444; margin-bottom: 1rem;"></i>
                    <p>Aucune commande.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filteredOrders.map(order => {

            const itemsHtml = Array.isArray(order.items)
                ? order.items.map(item => `
                    <div class="driver-item">
                        <span>${item.quantity || 1}x ${item.name}</span>
                        <span>${((item.price || 0) * (item.quantity || 1)).toFixed(2)} €</span>
                    </div>
                `).join('')
                : '<p style="color: #888;">Détails non disponibles</p>';

            // Calculate total from items if total_amount is missing
            const calculatedTotal = Array.isArray(order.items)
                ? order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
                : 0;
            const totalAmount = order.total_amount || order.total || calculatedTotal;

            // Use geo: protocol for native navigation apps, fallback to Google Maps
            const addressEncoded = encodeURIComponent(order.delivery_address);
            const gpsLink = `geo:0,0?q=${addressEncoded}`;
            const fallbackLink = `https://www.google.com/maps/search/?api=1&query=${addressEncoded}`;

            return `
                <div class="driver-order-card">
                    <div class="driver-order-header">
                        <div>
                            <div class="driver-order-id">Commande #${order.id.slice(0, 8)}</div>
                            <div class="driver-order-time">${new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <span class="order-status-badge status-${order.status}">${order.status === 'waiting_delivery' ? 'Prête' : 'En cours'}</span>
                    </div>
                    
                    <div class="driver-order-body">
                        <div class="driver-address">
                            <i class="fa-solid fa-location-dot"></i>
                            <div class="driver-address-text">
                                <div class="driver-address-label">Adresse de livraison</div>
                                <div class="driver-address-value">${order.delivery_address}</div>
                            </div>
                        </div>

                        ${order.customer_phone ? `
                            <div class="driver-address" style="margin-bottom: 1rem;">
                                <i class="fa-solid fa-phone"></i>
                                <div class="driver-address-text">
                                    <div class="driver-address-label">Contact client</div>
                                    <div class="driver-address-value">
                                        <a href="tel:${order.customer_phone}" style="color: var(--primary); text-decoration: none;">
                                            ${order.customer_phone}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <div class="driver-order-items">
                            <h5><i class="fa-solid fa-pizza-slice"></i> Articles</h5>
                            ${itemsHtml}
                        </div>

                        <div class="driver-order-total">
                            <span>Total</span>
                            <span>${totalAmount.toFixed(2)} €</span>
                        </div>
                    </div>

                    <div class="driver-order-actions">
                        ${order.status === 'waiting_delivery' ? `
                            <button class="btn-take-order" onclick="app.driverTakeOrder('${order.id}')">
                                <i class="fa-solid fa-hand-holding-box"></i> Prendre en charge
                            </button>
                        ` : `
                            <a href="${gpsLink}" onclick="setTimeout(() => window.open('${fallbackLink}', '_blank'), 500)" class="btn-gps-dark">
                                <i class="fa-solid fa-location-arrow"></i> Ouvrir GPS
                            </a>
                            <button class="btn-complete-order" onclick="app.driverCompleteOrder('${order.id}')">
                                <i class="fa-solid fa-check"></i> Marquer comme livrée
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    },

    switchDriverTab: (tab) => {
        document.querySelectorAll('.driver-tab-btn').forEach(b => b.classList.remove('active'));

        if (tab === 'available') {
            document.getElementById('tab-btn-available').classList.add('active');
        } else {
            document.getElementById('tab-btn-active').classList.add('active');
        }

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

    toggleOperatorCodes: () => {
        const codes = document.getElementById('operator-codes');
        codes.classList.toggle('hidden');
    },

    loadTracking: async (orderId) => {
        // Use anon key for public tracking (requires RLS policy update or function)
        // Since we don't have public RLS for orders, we might need a function or policy.
        // For now, let's try direct select assuming we might need to open it up or use a secure token.
        // We will need to add a policy for this: "Anyone can read order if they know the ID" -> Not possible easily with standard RLS without a "secret" column.
        // Let's use the `get_order_status` RPC we can create.

        const { data: order, error } = await supabase.rpc('get_order_tracking', { order_id_input: orderId });

        const container = document.getElementById('tracking-card-container'); // We'll update HTML to have this container

        if (error || !order || order.length === 0) {
            // Show Not Found State
            document.getElementById('tracking-content').style.display = 'none';
            document.getElementById('tracking-error').style.display = 'block';
            return;
        }

        // Show Content State
        document.getElementById('tracking-content').style.display = 'block';
        document.getElementById('tracking-error').style.display = 'none';

        const o = order[0];
        document.getElementById('tracking-order-id').innerText = `Commande #${o.id.slice(0, 8)}`;

        // Fix for undefined total - check both possible column names
        const total = o.total_amount !== undefined ? o.total_amount : (o.total !== undefined ? o.total : 0);
        document.getElementById('tracking-total').innerText = Number(total).toFixed(2) + ' €';

        // Items
        const itemsList = document.getElementById('tracking-items');
        itemsList.innerHTML = Array.isArray(o.items)
            ? o.items.map(item => `
                <div class="premium-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)} €</span>
                </div>
            `).join('')
            : '<div class="text-center text-muted">Aucun article</div>';

        // Status Logic
        let visualStepIndex = 0;
        if (o.status === 'new') visualStepIndex = 0;
        if (o.status === 'preparing') visualStepIndex = 1;
        if (o.status === 'waiting_delivery') visualStepIndex = 1; // Still in kitchen visually
        if (o.status === 'delivering') visualStepIndex = 2;
        if (o.status === 'delivered') visualStepIndex = 3;

        const visualSteps = ['new', 'preparing', 'delivering', 'delivered'];

        visualSteps.forEach((step, index) => {
            const el = document.getElementById(`step-${step}`);
            if (el) {
                el.classList.remove('active', 'completed');
                if (index < visualStepIndex) el.classList.add('completed');
                if (index === visualStepIndex) el.classList.add('active');
            }
        });

        // Update Text & Icon & Ring Color
        const statusText = document.getElementById('tracking-status-text');
        const statusDesc = document.getElementById('tracking-status-desc');
        const icon = document.getElementById('tracking-icon');
        const ring = document.getElementById('status-ring');

        // Reset ring style
        if (ring) {
            ring.style.borderTopColor = 'var(--primary)';
            ring.style.boxShadow = '0 0 30px rgba(255, 87, 34, 0.1)';
        }

        switch (o.status) {
            case 'new':
                statusText.innerText = "Commande Reçue";
                statusDesc.innerText = "La pizzeria a bien reçu votre commande.";
                icon.innerHTML = '<i class="fa-solid fa-receipt"></i>';
                break;
            case 'preparing':
                statusText.innerText = "En Préparation";
                statusDesc.innerText = "Vos pizzas sont au four !";
                icon.innerHTML = '<i class="fa-solid fa-fire-burner"></i>';
                if (ring) {
                    ring.style.borderTopColor = '#ff9800'; // Orange for cooking
                    ring.style.boxShadow = '0 0 40px rgba(255, 152, 0, 0.3)';
                }
                break;
            case 'waiting_delivery':
                statusText.innerText = "Prête (Cuisine)";
                statusDesc.innerText = "En attente d'un livreur.";
                icon.innerHTML = '<i class="fa-solid fa-box-open"></i>';
                if (ring) ring.style.borderTopColor = '#4caf50'; // Greenish
                break;
            case 'delivering':
                statusText.innerText = "En Livraison";
                statusDesc.innerText = "Le livreur est en route.";
                icon.innerHTML = '<i class="fa-solid fa-motorcycle"></i>';
                if (ring) {
                    ring.style.borderTopColor = '#2196f3'; // Blue for moving
                    ring.style.boxShadow = '0 0 40px rgba(33, 150, 243, 0.3)';
                }
                break;
            case 'delivered':
                statusText.innerText = "Livrée";
                statusDesc.innerText = "Bon appétit !";
                icon.innerHTML = '<i class="fa-solid fa-face-smile-beam"></i>';
                if (ring) {
                    ring.style.borderTopColor = '#00e676'; // Bright green
                    ring.style.boxShadow = '0 0 50px rgba(0, 230, 118, 0.4)';
                    ring.style.animation = 'none'; // Stop spinning
                    ring.style.border = '3px solid #00e676'; // Full circle
                }
                if (app.trackingRefreshInterval) clearInterval(app.trackingRefreshInterval);
                break;
        }
    },

    // --- Menu Editor Functions ---

    showMenuEditor: () => {
        const modal = document.getElementById('menu-editor-modal');
        if (modal) {
            // Normalize categories to match database constraints
            const validCategories = ['pizza', 'boisson', 'dessert', 'entree', 'accompagnement', 'autre'];

            if (app.tempMenuItems) {
                app.tempMenuItems = app.tempMenuItems.map(item => {
                    let category = (item.category || 'autre').toLowerCase().trim();

                    // Map common variations to valid categories
                    const categoryMap = {
                        'pizzas': 'pizza',
                        'boissons': 'boisson',
                        'desserts': 'dessert',
                        'entrees': 'entree',
                        'entrée': 'entree',
                        'entrées': 'entree',
                        'accompagnements': 'accompagnement',
                        'autres': 'autre',
                        'drink': 'boisson',
                        'drinks': 'boisson',
                        'starter': 'entree',
                        'starters': 'entree',
                        'side': 'accompagnement',
                        'sides': 'accompagnement'
                    };

                    // Apply mapping
                    category = categoryMap[category] || category;

                    // If still invalid, default to 'autre'
                    if (!validCategories.includes(category)) {
                        console.warn(`Invalid category "${item.category}" normalized to "autre"`);
                        category = 'autre';
                    }

                    return {
                        ...item,
                        category: category
                    };
                });
            }

            modal.style.display = 'flex'; // Use flex to center
            app.renderMenuItemsTable();
        }
    },

    renderMenuItemsTable: () => {
        const tbody = document.getElementById('menu-items-tbody');
        const countSpan = document.getElementById('menu-items-count');

        if (!tbody) return;

        tbody.innerHTML = '';
        const items = app.tempMenuItems || [];

        if (countSpan) countSpan.innerText = `${items.length} produits`;

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Aucun produit. Ajoutez-en un !</td></tr>';
            return;
        }

        items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <select onchange="app.updateMenuItem(${index}, 'category', this.value)">
                        <option value="pizza" ${item.category === 'pizza' ? 'selected' : ''}>Pizza</option>
                        <option value="boisson" ${item.category === 'boisson' ? 'selected' : ''}>Boisson</option>
                        <option value="dessert" ${item.category === 'dessert' ? 'selected' : ''}>Dessert</option>
                        <option value="entree" ${item.category === 'entree' ? 'selected' : ''}>Entrée</option>
                        <option value="accompagnement" ${item.category === 'accompagnement' ? 'selected' : ''}>Accompagnement</option>
                        <option value="autre" ${item.category === 'autre' ? 'selected' : ''}>Autre</option>
                    </select>
                </td>
                <td><input type="text" value="${item.name || ''}" onchange="app.updateMenuItem(${index}, 'name', this.value)" placeholder="Nom"></td>
                <td><input type="text" value="${item.description || ''}" onchange="app.updateMenuItem(${index}, 'description', this.value)" placeholder="Description"></td>
                <td><input type="number" step="0.01" value="${item.price || 0}" onchange="app.updateMenuItem(${index}, 'price', this.value)" style="width: 80px;"></td>
                <td>
                    <select onchange="app.updateMenuItem(${index}, 'size', this.value)" style="width: 100px;">
                        <option value="" ${!item.size ? 'selected' : ''}>-</option>
                        <option value="small" ${item.size === 'small' ? 'selected' : ''}>Petite</option>
                        <option value="medium" ${item.size === 'medium' ? 'selected' : ''}>Moyenne</option>
                        <option value="large" ${item.size === 'large' ? 'selected' : ''}>Grande</option>
                    </select>
                </td>
                <td>
                    <button class="btn-icon danger" onclick="app.deleteMenuItem(${index})" title="Supprimer">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    updateMenuItem: (index, field, value) => {
        if (!app.tempMenuItems) return;

        if (field === 'price') {
            app.tempMenuItems[index][field] = parseFloat(value);
        } else if (field === 'size' && value === '') {
            app.tempMenuItems[index][field] = null;
        } else {
            app.tempMenuItems[index][field] = value;
        }
    },

    addMenuItem: () => {
        if (!app.tempMenuItems) app.tempMenuItems = [];
        app.tempMenuItems.push({
            category: 'pizza',
            name: 'Nouveau produit',
            description: '',
            price: 10,
            size: null,
            available: true,
            display_order: app.tempMenuItems.length
        });
        app.renderMenuItemsTable();
    },

    deleteMenuItem: (index) => {
        if (!app.tempMenuItems) return;
        if (confirm('Supprimer ce produit ?')) {
            app.tempMenuItems.splice(index, 1);
            app.renderMenuItemsTable();
        }
    },

    cancelMenuEditor: () => {
        if (confirm('Voulez-vous vraiment annuler ? Le menu ne sera pas enregistré.')) {
            document.getElementById('menu-editor-modal').style.display = 'none';
            app.navigateTo('confirmation');
        }
    },

    saveMenuAndContinue: async () => {
        const btn = document.querySelector('#menu-editor-modal .btn-primary');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sauvegarde...';

        try {
            console.log('Starting menu save...', {
                pizzeriaId: app.currentPizzeriaId,
                itemsCount: app.tempMenuItems?.length
            });

            if (!app.currentPizzeriaId) {
                throw new Error('Pizzeria ID manquant');
            }

            if (!app.tempMenuItems || app.tempMenuItems.length === 0) {
                throw new Error('Aucun produit à sauvegarder');
            }

            const itemsToSave = app.tempMenuItems.map((item, index) => ({
                pizzeria_id: app.currentPizzeriaId,
                category: item.category,
                name: item.name,
                description: item.description || '',
                price: parseFloat(item.price),
                size: item.size || null,
                available: true,
                display_order: index
            }));

            console.log('Items to save:', itemsToSave);

            // Delete existing items (if any, though this is onboarding)
            const { error: deleteError } = await supabase
                .from('menu_items')
                .delete()
                .eq('pizzeria_id', app.currentPizzeriaId);

            if (deleteError) {
                console.warn('Delete error (may be normal if no items):', deleteError);
            }

            // Insert new items
            const { data, error } = await supabase
                .from('menu_items')
                .insert(itemsToSave)
                .select();

            if (error) {
                console.error('Insert error:', error);
                throw error;
            }

            console.log('Menu saved successfully:', data);

            // Update pizzeria with analysis timestamp
            await supabase
                .from('pizzerias')
                .update({ menu_analyzed_at: new Date().toISOString() })
                .eq('id', app.currentPizzeriaId);

            document.getElementById('menu-editor-modal').style.display = 'none';
            app.navigateTo('confirmation');

        } catch (error) {
            console.error('Error saving menu:', error);
            alert('Erreur lors de la sauvegarde du menu: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    app.checkTracking();

    // Handle menu source tabs
    const sourceTabs = document.querySelectorAll('.source-tab');
    sourceTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const source = e.target.dataset.source;

            // Update active tab
            sourceTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            // Show/hide panels
            const imagePanel = document.getElementById('image-source');
            const urlPanel = document.getElementById('url-source');

            if (source === 'image') {
                imagePanel.style.display = 'block';
                urlPanel.style.display = 'none';
            } else {
                imagePanel.style.display = 'none';
                urlPanel.style.display = 'block';
            }
        });
    });
});
