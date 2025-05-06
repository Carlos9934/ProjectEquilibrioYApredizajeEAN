// Alternar formularios
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const errorMsg = document.getElementById('errorMsg');

if (showRegister) {
  showRegister.onclick = (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    errorMsg.classList.add('hidden');
  };
}
if (showLogin) {
  showLogin.onclick = (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    errorMsg.classList.add('hidden');
  };
}

// Login
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  errorMsg.classList.add('hidden');
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      throw new Error('No se pudo conectar con el servidor o la API respondió con un error inesperado.');
    }
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/catalog.html';
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.classList.remove('hidden');
  }
};

// Registro
registerForm.onsubmit = async (e) => {
  e.preventDefault();
  errorMsg.classList.add('hidden');
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      throw new Error('No se pudo conectar con el servidor o la API respondió con un error inesperado.');
    }
    if (!res.ok) throw new Error(data.error || 'Error al registrarse');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/catalog.html';
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.classList.remove('hidden');
  }
};

// Si ya hay sesión, redirigir directo a catálogo
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('token') && localStorage.getItem('user')) {
    window.location.href = '/catalog.html';
  }
}); 