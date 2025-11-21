
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
        if (['onboarding', 'confirmation', 'dashboard'].includes(viewId) && !app.state.session) {
            app.navigateTo('login');
            return;
        }

        // Admin Guard
        if (viewId === 'admin-dashboard') {
            const user = app.state.session?.user;
            if (!user || user.email !== 'admin@pizzavoice.com') {
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
        if (['dashboard', 'onboarding', 'admin-dashboard', 'admin-login'].includes(viewId)) {
            navbar.style.display = 'none';
        } else {
            navbar.style.display = 'flex';
        }

        // Data Loading
        if (viewId === 'dashboard') await app.loadDashboard();
        if (viewId === 'admin-dashboard') await app.loadAdminDashboard();
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
            alert('Compte créé ! Veuillez vérifier vos emails pour confirmer votre inscription avant de continuer.');
            // For demo purposes, we might want to auto-login if email confirm is off, but usually it's on.
            // If the user confirms, they can come back and login.
            app.navigateTo('login');
        }
    },

    handleLogin: async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            // Check if they have a pizzeria
            const { data: pizzerias } = await supabase
                .from('pizzerias')
                .select('*')
                .eq('user_id', data.session.user.id)
                .single();

            if (pizzerias) {
                if (pizzerias.status === 'pending') {
                    app.navigateTo('confirmation');
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
        const name = document.getElementById('pizzeriaName').value;
        const user = app.state.session.user;

        const { error } = await supabase
            .from('pizzerias')
            .insert([
                {
                    user_id: user.id,
                    name: name,
                    address: 'Adresse par défaut', // Simplified for demo
                    status: 'pending'
                }
            ]);

        if (error) {
            alert('Erreur lors de la création: ' + error.message);
        } else {
            app.navigateTo('confirmation');
        }
    },

    handleAdminLogin: async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[name="adminId"]').value; // Using email input actually
        const password = e.target.querySelector('input[name="adminPass"]').value;

        // Admin must login as a real user
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            if (email === 'admin@pizzavoice.com') {
                app.navigateTo('admin-dashboard');
            } else {
                alert('Vous n\'êtes pas administrateur.');
                supabase.auth.signOut();
            }
        }
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
        }
    },

    loadAdminDashboard: async () => {
        const list = document.getElementById('admin-pizzeria-list');
        const pendingCount = document.getElementById('admin-pending-count');
        const activeCount = document.getElementById('admin-active-count');

        list.innerHTML = '<p>Chargement...</p>';

        // Fetch all pizzerias (RLS policy allows this for admin@pizzavoice.com)
        const { data: pizzerias, error } = await supabase
            .from('pizzerias')
            .select('*');

        if (error) {
            list.innerHTML = '<p class="error">Erreur de chargement (Êtes-vous connecté avec admin@pizzavoice.com ?)</p>';
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
                    <p>ID: ${p.id}</p>
                    <p>Cuisine: ${p.cuisine || 'Non spécifié'}</p>
                </div>
                <button onclick="app.activatePizzeria('${p.id}')" class="btn-small btn-primary">
                    <i class="fa-solid fa-check"></i> Configurer & Activer
                </button>
            `;
            list.appendChild(card);
        });
    },

    activatePizzeria: async (pizzeriaId) => {
        if (!confirm('Confirmer l\'activation ?')) return;

        const { error } = await supabase
            .from('pizzerias')
            .update({ status: 'active' })
            .eq('id', pizzeriaId);

        if (error) {
            alert('Erreur: ' + error.message);
        } else {
            alert('Pizzeria activée !');
            app.loadAdminDashboard();
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', app.init);
