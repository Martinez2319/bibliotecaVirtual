/**
 * Biblioteca Virtual - Funciones Comunes
 * Archivo centralizado para evitar código repetido
 */

// Convierte URLs de Google Drive a formato directo para imágenes
function convertDriveImageUrl(url) {
  if (!url) return url;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}

// Convierte URLs de Google Drive para PDFs embebidos
function convertPdfUrl(url) {
  if (!url) return url;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  if (url.includes('dropbox.com')) return url.replace('?dl=0', '?raw=1');
  return url;
}

// Escapa HTML para prevenir XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Verifica autenticación y actualiza UI
async function checkAuth(options = {}) {
  const { showAdmin = true, redirectOnFail = false } = options;
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      if (redirectOnFail) location.href = '/login';
      return null;
    }
    const user = await res.json();
    
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const adminLink = document.getElementById('adminLink');
    
    if (authLinks) authLinks.style.display = 'none';
    if (userMenu) userMenu.style.display = 'inline';
    if (userName) userName.textContent = user.name;
    if (adminLink && showAdmin && user.role === 'admin') adminLink.style.display = 'inline';
    
    return user;
  } catch (e) {
    if (redirectOnFail) location.href = '/login';
    return null;
  }
}

// Logout
async function doLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/';
}

// Configura botón de logout
function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      doLogout();
    });
  }
}

// Placeholder para imágenes
const PLACEHOLDER_IMG = 'https://placehold.co/180x250?text=Sin+Portada';

// Genera HTML de tarjeta de libro
function renderBookCard(book) {
  const cover = convertDriveImageUrl(book.coverUrl) || PLACEHOLDER_IMG;
  return `
    <div class="book-card" onclick="location.href='/book/${book._id}'">
      <img src="${cover}" alt="${escapeHtml(book.title)}" loading="lazy">
      <div class="book-card-content">
        <h3>${escapeHtml(book.title)}</h3>
        <p>${escapeHtml(book.author)}</p>
      </div>
    </div>
  `;
}