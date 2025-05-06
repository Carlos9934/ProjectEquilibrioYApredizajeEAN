// --- Video Library ---
async function fetchVideos() {
  const res = await fetch('/api/videos');
  const videos = await res.json();
  const videoList = document.getElementById('videoList');
  videoList.innerHTML = '';
  videos.forEach(video => {
    const videoId = extractYouTubeId(video.url);
    videoList.innerHTML += `
      <div class="bg-white rounded shadow p-4 flex flex-col gap-2">
        <div class="aspect-w-16 aspect-h-9 mb-2">
          <iframe class="w-full h-48 rounded" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
        </div>
        <div class="font-bold text-lg">${video.title}</div>
        <div class="text-gray-600 text-sm mb-2">${video.description || ''}</div>
      </div>
    `;
  });
}

function extractYouTubeId(url) {
  const match = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/);
  return match ? match[1] : '';
}

// --- Add Video Modal ---
const openAddVideo = document.getElementById('openAddVideo');
const closeAddVideo = document.getElementById('closeAddVideo');
const addVideoModal = document.getElementById('addVideoModal');
const addVideoForm = document.getElementById('addVideoForm');

openAddVideo.onclick = () => addVideoModal.classList.remove('hidden');
closeAddVideo.onclick = () => addVideoModal.classList.add('hidden');
addVideoModal.onclick = (e) => { if (e.target === addVideoModal) addVideoModal.classList.add('hidden'); };

addVideoForm.onsubmit = async (e) => {
  e.preventDefault();
  const form = new FormData(addVideoForm);
  const data = Object.fromEntries(form.entries());
  await fetch('/api/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  addVideoModal.classList.add('hidden');
  addVideoForm.reset();
  fetchVideos();
};

// --- Habit Tracker ---
async function fetchHabits() {
  const res = await fetch('/api/habits');
  const habit = await res.json();
  renderHabitTracker(habit);
}

function renderHabitTracker(habit) {
  const tracker = document.getElementById('habitTracker');
  tracker.innerHTML = `
    <div class="flex flex-col items-center gap-2">
      <span class="font-semibold">¿Estudiaste hoy?</span>
      <input type="checkbox" id="studied" ${habit.studied ? 'checked' : ''} class="w-6 h-6 text-green-500">
    </div>
    <div class="flex flex-col items-center gap-2">
      <span class="font-semibold">¿Meditaste hoy?</span>
      <input type="checkbox" id="meditated" ${habit.meditated ? 'checked' : ''} class="w-6 h-6 text-green-500">
    </div>
    <button id="saveHabits" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">Guardar</button>
  `;
  document.getElementById('saveHabits').onclick = async () => {
    const studied = document.getElementById('studied').checked ? 1 : 0;
    const meditated = document.getElementById('meditated').checked ? 1 : 0;
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), studied, meditated })
    });
    alert('¡Hábitos guardados!');
  };
}

// --- AUTH ---
function showAuthForms() {
  const authSection = document.getElementById('authSection');
  const mainContent = document.getElementById('mainContent');
  const navbarUser = document.getElementById('navbarUser');
  authSection.innerHTML = `
    <div class="flex flex-col md:flex-row gap-8 justify-center">
      <form id="loginForm" class="bg-white shadow rounded p-6 flex flex-col gap-4 w-full max-w-xs">
        <h3 class="font-bold text-lg mb-2">Iniciar Sesión</h3>
        <input type="email" name="email" placeholder="Email" required class="border p-2 rounded">
        <input type="password" name="password" placeholder="Contraseña" required class="border p-2 rounded">
        <button type="submit" class="bg-green-600 text-white rounded px-4 py-2">Entrar</button>
      </form>
      <form id="registerForm" class="bg-white shadow rounded p-6 flex flex-col gap-4 w-full max-w-xs">
        <h3 class="font-bold text-lg mb-2">Registrarse</h3>
        <input type="text" name="name" placeholder="Nombre" required class="border p-2 rounded">
        <input type="email" name="email" placeholder="Email" required class="border p-2 rounded">
        <input type="password" name="password" placeholder="Contraseña" required class="border p-2 rounded">
        <button type="submit" class="bg-green-600 text-white rounded px-4 py-2">Crear cuenta</button>
      </form>
    </div>
  `;
  mainContent.style.display = 'none';
  navbarUser.innerHTML = '';

  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      showAppUI();
    } else {
      alert(result.error || 'Error al iniciar sesión');
    }
  };

  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      showAppUI();
    } else {
      alert(result.error || 'Error al registrarse');
    }
  };
}

function showAppUI() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) {
    showAuthForms();
    return;
  }
  const authSection = document.getElementById('authSection');
  const mainContent = document.getElementById('mainContent');
  const navbarUser = document.getElementById('navbarUser');
  authSection.innerHTML = '';
  mainContent.style.display = '';
  navbarUser.innerHTML = `
    <span class="mr-4">${user.name} (${user.role === 'teacher' ? 'Docente' : 'Estudiante'})</span>
    <button id="logoutBtn" class="bg-red-500 text-white px-3 py-1 rounded">Salir</button>
  `;
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showAuthForms();
    };
  }
  // Aquí puedes llamar a fetchAndRenderCourses() si quieres cargar los cursos solo cuando hay sesión
  fetchAndRenderCourses();
}

// --- INIT AUTH ---
(function initAuth() {
  // Siempre mostrar login/registro al cargar
  showAuthForms();
})();

// --- Init ---
fetchVideos();
fetchHabits();

// --- CATÁLOGO DE CURSOS ---
async function fetchAndRenderCourses() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const res = await fetch('/api/courses', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  let courses = await res.json();

  // Filtros
  const search = document.getElementById('searchInput').value.toLowerCase();
  const checkedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
  const sort = document.getElementById('sortSelect').value;

  if (search) {
    courses = courses.filter(c => c.title.toLowerCase().includes(search) || (c.description && c.description.toLowerCase().includes(search)));
  }
  if (checkedCategories.length > 0) {
    courses = courses.filter(c => checkedCategories.includes(c.category));
  }
  if (sort === 'newest') {
    courses = courses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sort === 'oldest') {
    courses = courses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } // else if (sort === 'duration') { ... } // Puedes agregar lógica de duración si tienes ese dato

  renderCoursesGrid(courses);
}

function renderCoursesGrid(courses) {
  const grid = document.getElementById('coursesGrid');
  if (!courses.length) {
    grid.innerHTML = '<div class="col-span-3 text-center text-gray-500">No se encontraron cursos.</div>';
    return;
  }
  grid.innerHTML = courses.map(c => `
    <div class="bg-white rounded shadow p-4 flex flex-col cursor-pointer hover:shadow-lg transition" data-course-id="${c.id}">
      <img src="${c.image || '/ean-logo.png'}" alt="Portada curso" class="rounded mb-2 h-36 object-cover">
      <div class="flex justify-between items-center mb-1">
        <span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">All Levels</span>
        <span class="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded flex items-center gap-1"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-4 w-4 inline\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 8v4l3 3\" /></svg>3 Horas</span>
      </div>
      <div class="font-bold mb-1">${c.title}</div>
      <div class="text-gray-600 text-sm mb-2">${c.description || ''}</div>
      <div class="text-xs text-gray-400">Categoría: ${c.category || 'Sin categoría'}</div>
    </div>
  `).join('');

  // Agregar eventos para mostrar detalle
  Array.from(grid.children).forEach(card => {
    card.onclick = () => showCourseDetail(card.getAttribute('data-course-id'));
  });
}

// Modal o sección para detalle de curso
function showCourseDetail(courseId) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  fetch(`/api/courses/${courseId}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(res => res.json())
    .then(async course => {
      // Obtener módulos y lecciones
      const modulesRes = await fetch(`/api/courses/${courseId}/modules`, { headers: { 'Authorization': 'Bearer ' + token } });
      const modules = await modulesRes.json();
      for (const m of modules) {
        const lessonsRes = await fetch(`/api/modules/${m.id}/lessons`, { headers: { 'Authorization': 'Bearer ' + token } });
        m.lessons = await lessonsRes.json();
      }
      // Verificar si el usuario está inscrito
      let enrolled = false;
      if (user && user.role === 'student') {
        const myCoursesRes = await fetch('/api/my-courses', { headers: { 'Authorization': 'Bearer ' + token } });
        const myCourses = await myCoursesRes.json();
        enrolled = myCourses.some(c => c.id == courseId);
      }
      renderCourseDetailModal(course, modules, enrolled);
    });
}

function renderCourseDetailModal(course, modules, enrolled) {
  let modal = document.getElementById('courseDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'courseDetailModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
    document.body.appendChild(modal);
  }
  const user = JSON.parse(localStorage.getItem('user'));
  modal.innerHTML = `
    <div class="bg-white p-8 rounded shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
      <button id="closeCourseDetail" class="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
      <div class="flex flex-col md:flex-row gap-6">
        <img src="${course.image || '/ean-logo.png'}" alt="Portada curso" class="rounded h-40 w-40 object-cover mb-4 md:mb-0">
        <div class="flex-1">
          <h2 class="text-2xl font-bold mb-2">${course.title}</h2>
          <div class="text-gray-600 mb-2">${course.description || ''}</div>
          <div class="text-sm text-gray-500 mb-2">Docente: ${course.teacher_name || 'Desconocido'}</div>
          <div class="text-xs text-gray-400 mb-2">Creado: ${course.created_at ? course.created_at.split('T')[0] : ''}</div>
          ${user && user.role === 'student' ? `
            <button id="enrollBtn" class="mt-2 px-4 py-2 rounded ${enrolled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold transition">
              ${enrolled ? 'Desinscribirse' : 'Inscribirse'}
            </button>
          ` : ''}
        </div>
      </div>
      <div class="mt-6">
        <h3 class="font-semibold mb-2">Contenido</h3>
        ${modules.length === 0 ? '<div class="text-gray-400">Este curso aún no tiene módulos.</div>' : modules.map(m => `
          <div class="mb-2">
            <div class="font-bold">${m.title}</div>
            <ul class="ml-4 list-disc text-sm text-gray-700">
              ${m.lessons && m.lessons.length ? m.lessons.map(l => `<li>${l.title}</li>`).join('') : '<li class="text-gray-400">Sin lecciones</li>'}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  modal.onclick = e => { if (e.target === modal || e.target.id === 'closeCourseDetail') modal.remove(); };
  // Lógica de inscripción/desinscripción
  if (user && user.role === 'student') {
    const enrollBtn = document.getElementById('enrollBtn');
    if (enrollBtn) {
      enrollBtn.onclick = async () => {
        const token = localStorage.getItem('token');
        if (enrolled) {
          await fetch(`/api/courses/${course.id}/enroll`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
          });
        } else {
          await fetch(`/api/courses/${course.id}/enroll`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
          });
        }
        showCourseDetail(course.id); // Refrescar modal
      };
    }
  }
}

// --- EVENTOS DE FILTROS Y BUSCADOR ---
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const filtersForm = document.getElementById('filtersForm');
  const sortSelect = document.getElementById('sortSelect');
  const clearFilters = document.getElementById('clearFilters');
  if (searchInput && filtersForm && sortSelect && clearFilters) {
    searchInput.addEventListener('input', fetchAndRenderCourses);
    filtersForm.addEventListener('change', fetchAndRenderCourses);
    sortSelect.addEventListener('change', fetchAndRenderCourses);
    clearFilters.addEventListener('click', () => {
      filtersForm.reset();
      fetchAndRenderCourses();
    });
    fetchAndRenderCourses();
  }
});

// --- AGREGAR VIDEO (solo docentes) ---
document.addEventListener('DOMContentLoaded', () => {
  const openAddVideo = document.getElementById('openAddVideo');
  const closeAddVideo = document.getElementById('closeAddVideo');
  const addVideoModal = document.getElementById('addVideoModal');
  const addVideoForm = document.getElementById('addVideoForm');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (openAddVideo && closeAddVideo && addVideoModal && addVideoForm) {
    if (user.role === 'teacher') {
      openAddVideo.style.display = '';
    } else {
      openAddVideo.style.display = 'none';
    }
    openAddVideo.onclick = () => addVideoModal.classList.remove('hidden');
    closeAddVideo.onclick = () => addVideoModal.classList.add('hidden');
    addVideoModal.onclick = (e) => { if (e.target === addVideoModal) addVideoModal.classList.add('hidden'); };
    addVideoForm.onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(addVideoForm);
      const data = Object.fromEntries(form.entries());
      const token = localStorage.getItem('token');
      await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(data)
      });
      addVideoModal.classList.add('hidden');
      addVideoForm.reset();
      // Si tienes una función para recargar videos, llámala aquí
      if (typeof fetchVideos === 'function') fetchVideos();
    };
  }
});

localStorage.clear();
location.reload();

// --- NAVBAR LOGIC ---
function updateNavbar() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navRegister = document.getElementById('navRegister');
  const navLogin = document.getElementById('navLogin');
  const navLogout = document.getElementById('navLogout');
  const navbarUser = document.getElementById('navbarUser');

  if (token && user) {
    navRegister.style.display = 'none';
    navLogin.style.display = 'none';
    navLogout.style.display = '';
    navbarUser.textContent = `${user.name} (${user.role === 'teacher' ? 'Docente' : 'Estudiante'})`;
  } else {
    navRegister.style.display = '';
    navLogin.style.display = '';
    navLogout.style.display = 'none';
    navbarUser.textContent = '';
  }
}

// --- NAVEGACIÓN DINÁMICA SPA ---
function showSection(section) {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainContent').style.display = 'none';
  if (section === 'auth') {
    showAuthForms();
    document.getElementById('authSection').style.display = '';
  } else if (section === 'main') {
    // Solo mostrar main si está autenticado
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      showAppUI();
      document.getElementById('mainContent').style.display = '';
    } else {
      showAuthForms();
      document.getElementById('authSection').style.display = '';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  // Navegación
  document.getElementById('navHome').onclick = (e) => {
    e.preventDefault();
    showSection('main');
  };
  document.getElementById('navCourses').onclick = (e) => {
    e.preventDefault();
    showSection('main');
  };
  document.getElementById('navRegister').onclick = (e) => {
    e.preventDefault();
    showSection('auth');
    document.getElementById('registerForm').scrollIntoView({ behavior: 'smooth' });
  };
  document.getElementById('navLogin').onclick = (e) => {
    e.preventDefault();
    showSection('auth');
    document.getElementById('loginForm').scrollIntoView({ behavior: 'smooth' });
  };
  document.getElementById('navLogout').onclick = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showSection('auth');
    updateNavbar();
  };
});

// Llama updateNavbar en showAppUI y showAuthForms
const _showAppUI = showAppUI;
showAppUI = function() {
  _showAppUI();
  updateNavbar();
};
const _showAuthForms = showAuthForms;
showAuthForms = function() {
  _showAuthForms();
  updateNavbar();
}; 