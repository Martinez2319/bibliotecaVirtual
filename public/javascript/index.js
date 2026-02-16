// Auth
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      document.getElementById('authLinks').style.display = 'none';
      document.getElementById('userMenu').style.display = 'inline';
      document.getElementById('userName').textContent = user.name;
      if (user.role === 'admin') document.getElementById('adminLink').style.display = 'inline';
    }
  } catch (e) {}
}

document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
});

// Libros destacados
async function loadFeaturedBooks() {
  const res = await fetch('/api/books/featured');
  const books = await res.json();
  document.getElementById('featuredBooks').innerHTML = books.map(b => `
    <div class="book-card" onclick="location.href='/book/${b._id}'">
      <img src="${b.coverUrl || 'https://via.placeholder.com/180x250'}" alt="${b.title}">
      <div class="book-card-content">
        <h3>${b.title}</h3>
        <p>${b.author}</p>
      </div>
    </div>
  `).join('');
}

// Libros recientes
async function loadRecentBooks() {
  const res = await fetch('/api/books/recent');
  const books = await res.json();
  document.getElementById('recentBooks').innerHTML = books.map(b => `
    <div class="book-card" onclick="location.href='/book/${b._id}'">
      <img src="${b.coverUrl || 'https://via.placeholder.com/180x250'}" alt="${b.title}">
      <div class="book-card-content">
        <h3>${b.title}</h3>
        <p>${b.author}</p>
      </div>
    </div>
  `).join('');
}

// Categorías
async function loadCategories() {
  const res = await fetch('/api/categories');
  const categories = await res.json();
  document.getElementById('categories').innerHTML = categories.map(c => `
    <a href="/catalog?category=${c.name}" class="category-card">
      <div style="font-size:1.5rem;margin-bottom:0.5rem;">📖</div>
      ${c.name}
    </a>
  `).join('');
}

// Chat
let sessionId = null;
function toggleChat() {
  document.getElementById('chatWindow').classList.toggle('active');
}
document.getElementById('chatBtn')?.addEventListener('click', toggleChat);
document.getElementById('chatInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  const chat = document.getElementById('chatMessages');
  chat.innerHTML += `<div class="message user">${msg}</div>`;
  input.value = '';

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, sessionId })
  });
  const data = await res.json();
  sessionId = data.sessionId;
  chat.innerHTML += `<div class="message bot">${data.response}</div>`;
  chat.scrollTop = chat.scrollHeight;
}

// Donaciones
document.getElementById('donateBtn')?.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('donateModal').classList.add('active');
});

function closeDonateModal() {
  document.getElementById('donateModal').classList.remove('active');
}

function setAmount(val) {
  document.getElementById('donateAmount').value = val;
}

async function processDonation() {
  const amount = document.getElementById('donateAmount').value;
  const res = await fetch('/api/paypal/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: parseFloat(amount) })
  });
  const data = await res.json();
  await fetch(`/api/paypal/capture-order/${data.orderId}`, { method: 'POST' });
  alert('¡Gracias por tu donación!');
  closeDonateModal();
}

// Init
async function init() {
  await checkAuth();
  await fetch('/api/seed', { method: 'POST' });
  loadFeaturedBooks();
  loadRecentBooks();
  loadCategories();
}
init();
