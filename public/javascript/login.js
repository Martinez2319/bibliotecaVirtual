// Biblioteca Virtual - Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      location.href = data.user.role === 'admin' ? '/dashboard' : '/';
    } else {
      alert(data.error || 'Credenciales inválidas');
    }
  } catch (e) {
    alert('Error al iniciar sesión');
  }
});