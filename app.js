const app = {
    state: {
        currentUser: null,
        pizzeria: null,
        orders: []
    },

    init: () => {
        // Simple router based on hash or default to home
        const view = window.location.hash.replace('#', '') || 'home';
        app.navigateTo(view);

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const view = window.location.hash.replace('#', '');
            app.navigateTo(view);
        });
    },

    navigateTo: (viewId) => {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
        });

        // Show target view
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active');
            window.location.hash = viewId;
        }

        // Navbar logic
        const navbar = document.getElementById('navbar');
        if (viewId === 'dashboard' || viewId === 'onboarding') {
            navbar.style.display = 'none';
        } else {
            navbar.style.display = 'flex';
        }

        // Specific view logic
        if (viewId === 'confirmation') {
            app.startBackendSimulation();
        }
        if (viewId === 'dashboard') {
            app.loadDashboard();
        }
    },

    handleSignup: (e) => {
        e.preventDefault();
        // Simulate API call
        const email = e.target.querySelector('input[type="email"]').value;
        app.state.currentUser = { email };
        
        // Save to local storage (mock)
        localStorage.setItem('pizzaUser', JSON.stringify(app.state.currentUser));
        
        app.navigateTo('onboarding');
    },

    handleOnboarding: (e) => {
        e.preventDefault();
        const name = document.getElementById('pizzeriaName').value;
        
        app.state.pizzeria = { name };
        localStorage.setItem('pizzaData', JSON.stringify(app.state.pizzeria));

        app.navigateTo('confirmation');
    },

    startBackendSimulation: () => {
        // Reset state
        const steps = document.querySelectorAll('.loader-step');
        const emailNotif = document.getElementById('email-notification');
        
        steps.forEach(s => s.classList.remove('completed', 'active'));
        emailNotif.classList.add('hidden');

        // Step 1: Analyse
        steps[0].classList.add('active');
        
        setTimeout(() => {
            steps[0].classList.remove('active');
            steps[0].classList.add('completed');
            steps[1].classList.add('active');
        }, 1500);

        setTimeout(() => {
            steps[1].classList.remove('active');
            steps[1].classList.add('completed');
            steps[2].classList.add('active');
        }, 3000);

        setTimeout(() => {
            steps[2].classList.remove('active');
            steps[2].classList.add('completed');
            // Show Email
            emailNotif.classList.remove('hidden');
        }, 5000);
    },

    handleLogin: (e) => {
        e.preventDefault();
        app.navigateTo('dashboard');
    },

    loadDashboard: () => {
        const data = JSON.parse(localStorage.getItem('pizzaData'));
        if (data && data.name) {
            document.getElementById('dash-title').innerText = `Commandes - ${data.name}`;
        }
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', app.init);
