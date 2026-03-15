// Biblioteca Virtual - Index Page

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

// Cargar datos
async function loadFeaturedBooks() {
  const books = await fetch('/api/books/featured').then(r => r.json());
  document.getElementById('featuredBooks').innerHTML = books.map(renderBookCard).join('');
}

async function loadRecentBooks() {
  const books = await fetch('/api/books/recent').then(r => r.json());
  document.getElementById('recentBooks').innerHTML = books.map(renderBookCard).join('');
}

async function loadCategories() {
  const categories = await fetch('/api/categories').then(r => r.json());
  document.getElementById('categories').innerHTML = categories.map(c => `
    <a href="/catalog?category=${encodeURIComponent(c.name)}" class="category-card">
      <div style="font-size:1.5rem;margin-bottom:0.5rem;">📖</div>
      ${escapeHtml(c.name)}
    </a>
  `).join('');
}

// Init
async function init() {
  await checkAuth();
  setupLogout();
  fetch('/api/seed', { method: 'POST' });
  loadFeaturedBooks();
  loadRecentBooks();
  loadCategories();
  
  document.getElementById('donateBtn')?.addEventListener('click', e => {
    e.preventDefault();
    openDonateModal();
  });
}

init();