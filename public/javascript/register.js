// Biblioteca Virtual - Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      location.href = '/';
    } else {
      alert(data.error || 'Error al registrarse');
    }
  } catch (e) {
    alert('Error al registrarse');
  }
});