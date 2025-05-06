// Redirigir si no hay sesión
if (!localStorage.getItem('token') || !localStorage.getItem('user')) {
  window.location.href = '/login.html';
}

const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('navbarUser').textContent = `${user.name} (${user.role === 'teacher' ? 'Docente' : 'Estudiante'})`;

document.getElementById('navLogout').onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
};
document.getElementById('navCatalog').onclick = () => {
  window.location.href = '/catalog.html';
};
document.getElementById('navHome').onclick = () => {
  window.location.href = '/catalog.html';
};

// Cargar cursos inscritos
async function loadUserCourses() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/my-courses', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const courses = await res.json();
  const grid = document.getElementById('userCourses');
  if (!courses.length) {
    grid.innerHTML = '<div class="col-span-2 text-center text-gray-500">No estás inscrito en ningún curso.</div>';
    return;
  }
  grid.innerHTML = courses.map(c => `
    <div class="bg-white rounded shadow p-4 flex flex-col">
      <img src="${c.image || '/ean-logo.png'}" alt="Portada curso" class="rounded mb-2 h-32 object-cover">
      <div class="font-bold mb-1">${c.title}</div>
      <div class="text-gray-600 text-sm mb-2">${c.description || ''}</div>
      <div class="text-xs text-gray-400 mb-2">Docente: ${c.teacher_name || 'Desconocido'}</div>
      <a href="/catalog.html" class="text-green-700 hover:underline text-sm">Ver curso</a>
    </div>
  `).join('');
}

// Cargar badges
async function loadUserBadges() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/my-badges', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const badges = await res.json();
  const grid = document.getElementById('userBadges');
  if (!badges.length) {
    grid.innerHTML = '<div class="text-gray-500">Aún no tienes badges.</div>';
    return;
  }
  grid.innerHTML = badges.map(b => `
    <div class="flex flex-col items-center bg-white rounded shadow p-4 w-32">
      <img src="${b.icon || '/ean-logo.png'}" alt="Badge" class="h-12 w-12 mb-2">
      <div class="font-bold text-sm text-green-700 mb-1">${b.name}</div>
      <div class="text-xs text-gray-500 text-center">${b.description || ''}</div>
    </div>
  `).join('');
}

loadUserCourses();
loadUserBadges(); 