// Biblioteca Virtual - Dashboard Admin

let allCategories = [];

// Init auth
async function initAuth() {
  const user = await checkAuth({ redirectOnFail: true });
  if (!user || user.role !== 'admin') {
    location.href = '/';
    return false;
  }
  document.getElementById('userName').textContent = user.name;
  return true;
}

// Stats
async function loadStats() {
  const stats = await fetch('/api/stats').then(r => r.json());
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

// === LIBROS ===
async function loadBooks() {
  const books = await fetch('/api/books').then(r => r.json());
  document.getElementById('booksTable').innerHTML = books.map(b => {
    const formato = b.pdfUrl && b.content ? '📄📝' : b.pdfUrl ? '📄 PDF' : b.content ? '📝 Texto' : '—';
    return `<tr>
      <td>${escapeHtml(b.title)}</td>
      <td>${escapeHtml(b.author)}</td>
      <td>${formato}</td>
      <td>${b.views}</td>
      <td>
        <button class="btn-sm" onclick="editBook('${b._id}')">✏️</button>
        <button class="btn-sm btn-danger" onclick="deleteBook('${b._id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');
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

function closeBookModal() {
  document.getElementById('bookModal').classList.remove('active');
}

async function editBook(id) {
  const book = await fetch(`/api/books/${id}`).then(r => r.json());
  openBookModal(book);
}

async function deleteBook(id) {
  if (!confirm('¿Eliminar este libro?')) return;
  await fetch(`/api/books/${id}`, { method: 'DELETE' });
  loadBooks();
  loadStats();
}

document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('bookId').value;
  const data = {
    title: document.getElementById('bookTitle').value,
    author: document.getElementById('bookAuthor').value,
    description: document.getElementById('bookDesc').value,
    categories: document.getElementById('bookCategories').value.split(',').map(c => c.trim()).filter(Boolean),
    coverUrl: document.getElementById('bookCover').value,
    pdfUrl: document.getElementById('bookPdf').value,
    content: document.getElementById('bookContent').value
  };
  await fetch(id ? `/api/books/${id}` : '/api/books', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  closeBookModal();
  loadBooks();
  loadStats();
});

// === CATEGORÍAS ===
async function loadCategories() {
  const cats = await fetch('/api/categories').then(r => r.json());
  allCategories = cats;
  document.getElementById('categoriesTable').innerHTML = cats.map(c => `<tr>
    <td>${escapeHtml(c.name)}</td>
    <td>${escapeHtml(c.slug)}</td>
    <td>
      <button class="btn-sm" onclick="editCategory('${c._id}')">✏️</button>
      <button class="btn-sm btn-danger" onclick="deleteCategory('${c._id}')">🗑️</button>
    </td>
  </tr>`).join('');
}

function openCategoryModal(cat = null) {
  document.getElementById('categoryModal').classList.add('active');
  document.getElementById('categoryModalTitle').textContent = cat ? 'Editar Categoría' : 'Nueva Categoría';
  document.getElementById('categoryId').value = cat?._id || '';
  document.getElementById('categoryName').value = cat?.name || '';
  document.getElementById('categorySlug').value = cat?.slug || '';
  document.getElementById('categoryDesc').value = cat?.description || '';
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('active');
}

function editCategory(id) {
  const cat = allCategories.find(c => c._id === id);
  if (cat) openCategoryModal(cat);
}

async function deleteCategory(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  await fetch(`/api/categories/${id}`, { method: 'DELETE' });
  loadCategories();
  loadStats();
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
  closeCategoryModal();
  loadCategories();
  loadStats();
});

document.getElementById('categoryName').addEventListener('input', (e) => {
  document.getElementById('categorySlug').value = e.target.value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
});

// === USUARIOS ===
async function loadUsers() {
  const users = await fetch('/api/users').then(r => r.json());
  document.getElementById('usersTable').innerHTML = users.map(u => `<tr>
    <td>${escapeHtml(u.name)}</td>
    <td>${escapeHtml(u.email)}</td>
    <td>
      <select onchange="updateRole('${u._id}', this.value)">
        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
    </td>
    <td><button class="btn-sm btn-danger" onclick="deleteUser('${u._id}')">🗑️</button></td>
  </tr>`).join('');
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
  loadUsers();
  loadStats();
}

// === PC REMOTO ===
async function loadRemoteStatus() {
  const statusEl = document.getElementById('remoteStatusInfo');
  const filesEl = document.getElementById('remoteFilesInfo');
  const pcStatusValue = document.getElementById('pcStatusValue');
  const pcStatusCard = document.getElementById('pcStatus');

  try {
    const data = await fetch('/api/remote/status').then(r => r.json());

    if (!data.connected && data.message === 'No hay PC configurado') {
      pcStatusValue.textContent = 'No config';
      pcStatusCard.style.background = '#f3f4f6';
      statusEl.innerHTML = `
        <p style="color:#6b7280;">No hay PC configurado.</p>
        <p style="margin-top:0.5rem;font-size:0.9rem;">Ejecuta <code>iniciar.bat</code> en tu PC desde <code>pc-server</code></p>`;
      return;
    }

    if (data.connected) {
      pcStatusValue.textContent = '✅ Online';
      pcStatusCard.style.background = '#dcfce7';
      statusEl.innerHTML = `
        <p><strong>Nombre:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Estado:</strong> <span style="color:#16a34a;">🟢 Conectado</span></p>
        <p><strong>Última conexión:</strong> ${new Date(data.lastSeen).toLocaleString()}</p>`;
      loadRemoteFiles();
    } else {
      pcStatusValue.textContent = '❌ Offline';
      pcStatusCard.style.background = '#fee2e2';
      statusEl.innerHTML = `
        <p><strong>Nombre:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Estado:</strong> <span style="color:#dc2626;">🔴 Desconectado</span></p>
        <p><strong>Última conexión:</strong> ${data.lastSeen ? new Date(data.lastSeen).toLocaleString() : 'Nunca'}</p>`;
      filesEl.innerHTML = '<p style="color:#6b7280;">El PC debe estar conectado para ver los archivos.</p>';
    }
  } catch (e) {
    pcStatusValue.textContent = 'Error';
    statusEl.innerHTML = '<p style="color:#dc2626;">Error al verificar estado</p>';
  }
}

async function loadRemoteFiles() {
  const filesEl = document.getElementById('remoteFilesInfo');
  try {
    const res = await fetch('/api/remote/files');
    if (!res.ok) {
      filesEl.innerHTML = '<p style="color:#6b7280;">No se pudo conectar con el PC.</p>';
      return;
    }
    const data = await res.json();
    let html = '';

    if (data.pdfs?.length) {
      html += '<h4 style="margin:1rem 0 0.5rem;">📄 PDFs:</h4><ul style="padding-left:1.5rem;">';
      data.pdfs.forEach(f => {
        html += `<li><code>remote:${escapeHtml(f.name)}</code> <span style="color:#6b7280;">(${(f.size/1024/1024).toFixed(2)} MB)</span></li>`;
      });
      html += '</ul>';
    } else {
      html += '<p style="color:#6b7280;margin-top:0.5rem;">No hay PDFs.</p>';
    }

    if (data.covers?.length) {
      html += '<h4 style="margin:1rem 0 0.5rem;">🖼️ Portadas:</h4><ul style="padding-left:1.5rem;">';
      data.covers.forEach(f => {
        html += `<li><code>remote:${escapeHtml(f.name)}</code> <span style="color:#6b7280;">(${(f.size/1024).toFixed(0)} KB)</span></li>`;
      });
      html += '</ul>';
    } else {
      html += '<p style="color:#6b7280;margin-top:0.5rem;">No hay portadas.</p>';
    }

    if (data.booksFolder) {
      html += `<p style="margin-top:1rem;font-size:0.85rem;color:#6b7280;">📁 Carpeta: <code>${escapeHtml(data.booksFolder)}</code></p>`;
    }
    filesEl.innerHTML = html;
  } catch (e) {
    filesEl.innerHTML = '<p style="color:#dc2626;">Error cargando archivos</p>';
  }
}

// === INIT ===
async function init() {
  if (!await initAuth()) return;
  setupLogout();
  loadStats();
  loadBooks();
  loadCategories();
  loadUsers();
  loadRemoteStatus();
}

init();