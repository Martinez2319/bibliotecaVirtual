// Auth check
async function checkAuth() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) { location.href = '/login'; return; }
  const user = await res.json();
  if (user.role !== 'admin') { location.href = '/'; return; }
  document.getElementById('userName').textContent = user.name;
}

document.getElementById('logoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/login';
});

// Stats
async function loadStats() {
  const res = await fetch('/api/stats');
  const stats = await res.json();
  document.getElementById('totalBooks').textContent = stats.totalBooks;
  document.getElementById('totalUsers').textContent = stats.totalUsers;
  document.getElementById('totalCategories').textContent = stats.totalCategories;
}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
  });
});

// Books
async function loadBooks() {
  const res = await fetch('/api/books');
  const books = await res.json();
  document.getElementById('booksTable').innerHTML = books.map(b => {
    let formato = '';
    if (b.pdfUrl && b.content) formato = '📄📝';
    else if (b.pdfUrl) formato = '📄 PDF';
    else if (b.content) formato = '📝 Texto';
    else formato = '—';
    
    return `
    <tr>
      <td>${b.title}</td>
      <td>${b.author}</td>
      <td>${formato}</td>
      <td>${b.views}</td>
      <td>
        <button class="btn-sm" onclick="editBook('${b._id}')">✏️</button>
        <button class="btn-sm btn-danger" onclick="deleteBook('${b._id}')">🗑️</button>
      </td>
    </tr>
  `}).join('');
}

function openBookModal(book = null) {
  document.getElementById('bookModal').classList.add('active');
  document.getElementById('bookModalTitle').textContent = book ? 'Editar Libro' : 'Nuevo Libro';
  document.getElementById('bookId').value = book?._id || '';
  document.getElementById('bookTitle').value = book?.title || '';
  document.getElementById('bookAuthor').value = book?.author || '';
  document.getElementById('bookDesc').value = book?.description || '';
  document.getElementById('bookCategories').value = (book?.categories || []).join(', ');
  document.getElementById('bookCover').value = book?.coverUrl || '';
  document.getElementById('bookPdf').value = book?.pdfUrl || '';
  document.getElementById('bookContent').value = book?.content || '';
}

function closeBookModal() { document.getElementById('bookModal').classList.remove('active'); }

async function editBook(id) {
  const res = await fetch(`/api/books/${id}`);
  const book = await res.json();
  openBookModal(book);
}

async function deleteBook(id) {
  if (!confirm('¿Eliminar este libro?')) return;
  await fetch(`/api/books/${id}`, { method: 'DELETE' });
  loadBooks(); loadStats();
}

document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('bookId').value;
  const data = {
    title: document.getElementById('bookTitle').value,
    author: document.getElementById('bookAuthor').value,
    description: document.getElementById('bookDesc').value,
    categories: document.getElementById('bookCategories').value.split(',').map(c => c.trim()).filter(c => c),
    coverUrl: document.getElementById('bookCover').value,
    pdfUrl: document.getElementById('bookPdf').value,
    content: document.getElementById('bookContent').value
  };
  await fetch(id ? `/api/books/${id}` : '/api/books', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  closeBookModal(); loadBooks(); loadStats();
});

// Categories
async function loadCategories() {
  const res = await fetch('/api/categories');
  const cats = await res.json();
  document.getElementById('categoriesTable').innerHTML = cats.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.slug}</td>
      <td>
        <button class="btn-sm" onclick="editCategory('${c._id}')">✏️</button>
        <button class="btn-sm btn-danger" onclick="deleteCategory('${c._id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

let allCategories = [];
async function editCategory(id) {
  if (!allCategories.length) {
    const res = await fetch('/api/categories');
    allCategories = await res.json();
  }
  const cat = allCategories.find(c => c._id === id);
  openCategoryModal(cat);
}

function openCategoryModal(cat = null) {
  document.getElementById('categoryModal').classList.add('active');
  document.getElementById('categoryModalTitle').textContent = cat ? 'Editar Categoría' : 'Nueva Categoría';
  document.getElementById('categoryId').value = cat?._id || '';
  document.getElementById('categoryName').value = cat?.name || '';
  document.getElementById('categorySlug').value = cat?.slug || '';
  document.getElementById('categoryDesc').value = cat?.description || '';
}

function closeCategoryModal() { document.getElementById('categoryModal').classList.remove('active'); }

async function deleteCategory(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  await fetch(`/api/categories/${id}`, { method: 'DELETE' });
  loadCategories(); loadStats();
}

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const data = {
    name: document.getElementById('categoryName').value,
    slug: document.getElementById('categorySlug').value,
    description: document.getElementById('categoryDesc').value
  };
  await fetch(id ? `/api/categories/${id}` : '/api/categories', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  closeCategoryModal(); loadCategories(); loadStats(); allCategories = [];
});

document.getElementById('categoryName').addEventListener('input', (e) => {
  document.getElementById('categorySlug').value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
});

// Users
async function loadUsers() {
  const res = await fetch('/api/users');
  const users = await res.json();
  document.getElementById('usersTable').innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>
        <select onchange="updateRole('${u._id}', this.value)">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td><button class="btn-sm btn-danger" onclick="deleteUser('${u._id}')">🗑️</button></td>
    </tr>
  `).join('');
}

async function updateRole(id, role) {
  await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
}

async function deleteUser(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  await fetch(`/api/users/${id}`, { method: 'DELETE' });
  loadUsers(); loadStats();
}

// Init
checkAuth();
loadStats();
loadBooks();
loadCategories();
loadUsers();