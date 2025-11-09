// Simple hash router with a mount pattern.

const routes = {
  '#/dashboard': async (root) => {
    const module = await import('./screens/dashboard.js');
    return module.default(root);
  },

  '#/calls': async (root) => {
    const module = await import('./screens/calls.js');
    return module.default(root);
  },

  '#/create-calls': async (root) => {
    const module = await import('./screens/create_calls.js');
    return module.default(root);
  },

  // ✅ Workflow Designer
  '#/workflow': async (root) => {
    const module = await import('./screens/designworkflow.js');
    return module.default(root);
  },

  // ✅ Email campaigns
  '#/emails': async (root) => {
    const module = await import('./screens/emails.js');
    return module.default(root);
  },

  '#/create-emails': async (root) => {
    const module = await import('./screens/create_emails.js');
    return module.default(root);
  },

  '#/call-execution': async (root) => {
    const module = await import('./screens/call_execution.js');
    return module.default(root);
  },

  // ✅ Stubs (unique keys, no duplicates)
  '#/tasks': (root) => showPlaceholder(root, 'Tasks'),
  '#/insights': (root) => showPlaceholder(root, 'Insights'),
  '#/contacts': (root) => showPlaceholder(root, 'Contacts'),
};

const DEFAULT_ROUTE = '#/dashboard';
const appRoot = document.getElementById('app');
const topbar = document.getElementById('topbar');
const menuBtn = document.getElementById('menu-btn');

function setActiveTab(hash) {
  const links = document.querySelectorAll('.tab-link');
  const base = hash.split('?')[0]; // strip query
  links.forEach((a) => {
    const route = a.getAttribute('data-route');
    a.classList.toggle('active', route === base);
  });
}

async function renderRoute() {
  const hash = location.hash || DEFAULT_ROUTE;
  const base = hash.split('?')[0];

  if (!routes[base]) {
    location.hash = DEFAULT_ROUTE;
    return;
  }

  setActiveTab(hash);
  appRoot.innerHTML = '';

  try {
    await routes[base](appRoot);
  } catch (err) {
    console.error(err);
    appRoot.innerHTML = `<div class="centered">There was an error loading this screen.</div>`;
  }

  // Close mobile menu after navigating
  if (topbar?.classList.contains('open')) {
    topbar.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }
}

function showPlaceholder(root, title) {
  root.innerHTML = `
    <section class="page-head"><h1 class="page-title">${title}</h1></section>
    <div class="card wide">
      <div>
        <div class="kicker">Coming soon</div>
        <div class="big" style="margin-bottom:6px">This screen is a stub</div>
        <p class="label" style="max-width:720px">
          Create <code>./screens/${title.toLowerCase().replace(' ', '-')}.js</code>
          and export <code>default (root) =&gt; { /* render */ }</code>.
        </p>
      </div>
    </div>`;
}

// Top bar links update hash
document.getElementById('top-tabs')?.addEventListener('click', (e) => {
  const a = e.target.closest('.tab-link');
  if (!a) return;
  e.preventDefault();
  const route = a.getAttribute('data-route');
  if (route) location.hash = route;
});

// Mobile menu toggle
menuBtn?.addEventListener('click', () => {
  const open = topbar.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});

// Route on initial load + on hash change
window.addEventListener('hashchange', renderRoute);
window.addEventListener('DOMContentLoaded', () => {
  if (!location.hash) location.hash = DEFAULT_ROUTE;
  renderRoute();
});
