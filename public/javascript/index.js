// PayPal
let paypalSdkLoaded = false;

async function loadPaypalSdk() {
  if (paypalSdkLoaded) return true;
  try {
    const cfg = await fetch('/api/paypal/config').then(r => r.json());
    if (!cfg.clientId) {
      alert('Falta configurar PAYPAL_CLIENT_ID en el servidor');
      return false;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${cfg.clientId}&currency=${cfg.currency || 'USD'}`;
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    paypalSdkLoaded = true;
    return true;
  } catch (e) {
    return false;
  }
}

async function renderPaypal() {
  const amount = Number(document.getElementById('donateAmount').value);
  if (!Number.isFinite(amount) || amount <= 0) {
    alert('Monto inválido');
    return;
  }
  if (!await loadPaypalSdk()) return;

  const container = document.getElementById('paypalButtons');
  container.innerHTML = '';

  window.paypal.Buttons({
    createOrder: async () => {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la orden');
      return data.orderId;
    },
    onApprove: async (data) => {
      const res = await fetch(`/api/paypal/capture-order/${data.orderID}`, { method: 'POST' });
      if (!res.ok) throw new Error('No se pudo capturar');
      alert('¡Gracias por tu donación!');
      closeDonateModal();
    },
    onError: (err) => {
      console.error('PayPal error:', err);
      alert('Error con PayPal');
    }
  }).render('#paypalButtons');
}

// Modal de donación
function openDonateModal() {
  document.getElementById('donateModal').classList.add('active');
}

function closeDonateModal() {
  document.getElementById('donateModal').classList.remove('active');
}

function setAmount(val) {
  document.getElementById('donateAmount').value = val;
}

// Skeleton loaders para carga rápida
function renderSkeletonCards(count = 4) {
  return Array(count).fill(`
    <div class="book-card skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="book-card-content">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
      </div>
    </div>
  `).join('');
}

function renderSkeletonCategories(count = 6) {
  return Array(count).fill(`
    <div class="category-card skeleton-category">
      <div class="skeleton skeleton-icon"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
  `).join('');
}

// Mostrar skeletons inmediatamente
function showSkeletons() {
  document.getElementById('featuredBooks').innerHTML = renderSkeletonCards(4);
  document.getElementById('recentBooks').innerHTML = renderSkeletonCards(4);
  document.getElementById('categories').innerHTML = renderSkeletonCategories(6);
}

// Cargar datos en paralelo con caché
const dataCache = { featured: null, recent: null, categories: null };

async function loadFeaturedBooks() {
  try {
    if (dataCache.featured) {
      document.getElementById('featuredBooks').innerHTML = dataCache.featured.map(renderBookCard).join('');
      return;
    }
    const books = await fetch('/api/books/featured').then(r => r.json());
    dataCache.featured = books;
    document.getElementById('featuredBooks').innerHTML = books.map(renderBookCard).join('');
  } catch(e) {
    document.getElementById('featuredBooks').innerHTML = '<p style="color:#888;padding:1rem;">Error al cargar</p>';
  }
}

async function loadRecentBooks() {
  try {
    if (dataCache.recent) {
      document.getElementById('recentBooks').innerHTML = dataCache.recent.map(renderBookCard).join('');
      return;
    }
    const books = await fetch('/api/books/recent').then(r => r.json());
    dataCache.recent = books;
    document.getElementById('recentBooks').innerHTML = books.map(renderBookCard).join('');
  } catch(e) {
    document.getElementById('recentBooks').innerHTML = '<p style="color:#888;padding:1rem;">Error al cargar</p>';
  }
}

async function loadCategories() {
  try {
    if (dataCache.categories) {
      document.getElementById('categories').innerHTML = dataCache.categories.map(c => `
        <a href="/catalog?category=${encodeURIComponent(c.name)}" class="category-card">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">📖</div>
          ${escapeHtml(c.name)}
        </a>
      `).join('');
      return;
    }
    const categories = await fetch('/api/categories').then(r => r.json());
    dataCache.categories = categories;
    document.getElementById('categories').innerHTML = categories.map(c => `
      <a href="/catalog?category=${encodeURIComponent(c.name)}" class="category-card">
        <div style="font-size:1.5rem;margin-bottom:0.5rem;">📖</div>
        ${escapeHtml(c.name)}
      </a>
    `).join('');
  } catch(e) {
    document.getElementById('categories').innerHTML = '<p style="color:#888;padding:1rem;">Error al cargar</p>';
  }
}

// Init con carga paralela
async function init() {
  // Mostrar skeletons INMEDIATAMENTE
  showSkeletons();
  
  // Iniciar auth y seed en segundo plano (no bloquea UI)
  checkAuth().then(() => setupLogout());
  fetch('/api/seed', { method: 'POST' });
  
  // Cargar TODO en paralelo - esto es clave para velocidad
  await Promise.all([
    loadFeaturedBooks(),
    loadRecentBooks(),
    loadCategories()
  ]);
  
  document.getElementById('donateBtn')?.addEventListener('click', e => {
    e.preventDefault();
    openDonateModal();
  });
}

init();