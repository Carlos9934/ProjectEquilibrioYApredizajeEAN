// Estado global
const state = {
  user: null,
  token: null,
  courses: [],
  filteredCourses: [],
  enrollments: new Map(),
  progress: new Map(),
  ratings: new Map()
};

// Inicialización
async function initialize() {
  // Verificar autenticación
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  if (!user || !token) {
    window.location.href = '/login.html';
    return;
  }

  state.user = user;
  state.token = token;

  // Configurar UI inicial
  setupUI();
  
  // Cargar datos
  await loadData();
}

// Configurar UI
function setupUI() {
  // Configurar barra de navegación
  document.getElementById('navbarUser').textContent = 
    `${state.user.name} (${state.user.role === 'teacher' ? 'Docente' : 'Estudiante'})`;

  // Mostrar botón de crear curso para docentes
  if (state.user.role === 'teacher') {
    document.getElementById('createCourseBtn').classList.remove('hidden');
  }

  // Configurar navegación
  document.getElementById('navLogout').onclick = handleLogout;
  document.getElementById('navPanel').onclick = () => window.location.href = '/panel.html';
  document.getElementById('navHome').onclick = () => window.location.href = '/catalog.html';

  // Configurar búsqueda y filtros
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('categoryFilter').addEventListener('change', handleFilter);

  // Configurar modales
  setupModals();
}

// Configurar modales
function setupModals() {
  // Modal de detalles del curso
  document.getElementById('closeModal').onclick = () => {
    document.getElementById('courseModal').classList.add('hidden');
  };

  // Modal de creación de curso
  const courseFormModal = document.getElementById('courseFormModal');
  document.getElementById('createCourseBtn').onclick = () => {
    courseFormModal.classList.remove('hidden');
  };
  document.getElementById('closeFormModal').onclick = () => {
    courseFormModal.classList.add('hidden');
  };
  document.getElementById('cancelCourse').onclick = () => {
    courseFormModal.classList.add('hidden');
  };
  document.getElementById('courseForm').onsubmit = handleCreateCourse;
}

// Cargar datos
async function loadData() {
  try {
    const [courses, enrollments, progress, ratings] = await Promise.all([
      fetchCourses(),
      fetchEnrollments(),
      fetchProgress(),
      fetchRatings()
    ]);

    state.courses = courses;
    state.filteredCourses = [...courses];
    state.enrollments = new Map(enrollments.map(e => [e.course_id, e]));
    state.progress = new Map(progress.map(p => [p.course_id, p.progress]));
    state.ratings = new Map(ratings.map(r => [r.course_id, r]));

    renderCourses();
  } catch (error) {
    console.error('Error al cargar datos:', error);
    showError('Error al cargar los cursos. Por favor, intenta nuevamente.');
  }
}

// Funciones de fetch
async function fetchCourses() {
  const response = await fetch('/api/courses', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  if (!response.ok) throw new Error('Error al cargar cursos');
  return response.json();
}

async function fetchEnrollments() {
  const response = await fetch('/api/my-enrollments', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  if (!response.ok) return [];
  return response.json();
}

async function fetchProgress() {
  const response = await fetch('/api/my-progress', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  if (!response.ok) return [];
  return response.json();
}

async function fetchRatings() {
  const response = await fetch('/api/course-ratings', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  if (!response.ok) return [];
  return response.json();
}

// Renderizar cursos
function renderCourses() {
  const courseGrid = document.getElementById('courseGrid');
  if (!courseGrid) return;

  if (state.filteredCourses.length === 0) {
    courseGrid.innerHTML = '<div class="col-span-full text-center text-gray-500">No se encontraron cursos.</div>';
    return;
  }

  courseGrid.innerHTML = state.filteredCourses.map(course => {
    const isEnrolled = state.enrollments.has(course.id);
    const progress = state.progress.get(course.id) || 0;
    const rating = state.ratings.get(course.id);
    
    return `
      <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div class="relative">
          <img src="${course.image || '/ean-logo.png'}" alt="${course.title}" class="w-full h-48 object-cover">
          ${isEnrolled ? `
            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full" style="width: ${progress}%"></div>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-2">${course.title}</h3>
          <p class="text-gray-600 text-sm mb-4 line-clamp-2">${course.description || 'Sin descripción'}</p>
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">${course.teacher_name || 'Docente'}</span>
              ${rating ? `
                <div class="flex text-yellow-400">
                  ${Array(5).fill().map((_, i) => `
                    <i class="fas fa-star${i < rating.average_rating ? '' : '-o'}"></i>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <button onclick="showCourseDetails(${course.id})" class="text-green-600 hover:text-green-700 font-medium">
              Ver detalles
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Manejadores de eventos
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  filterCourses(searchTerm, category);
}

function handleFilter(e) {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  filterCourses(searchTerm, e.target.value);
}

function filterCourses(searchTerm, category) {
  state.filteredCourses = state.courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm) ||
                         course.description?.toLowerCase().includes(searchTerm);
    const matchesCategory = !category || course.category === category;
    return matchesSearch && matchesCategory;
  });
  renderCourses();
}

async function handleCreateCourse(e) {
  e.preventDefault();
  const formData = {
    title: document.getElementById('courseTitle').value,
    description: document.getElementById('courseDescription').value,
    category: document.getElementById('courseCategory').value,
    duration: parseInt(document.getElementById('courseDuration').value),
    image: document.getElementById('courseImage').value || null
  };

  try {
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Error al crear el curso');

    const newCourse = await response.json();
    state.courses.push(newCourse);
    state.filteredCourses.push(newCourse);
    
    document.getElementById('courseFormModal').classList.add('hidden');
    renderCourses();
    showSuccess('¡Curso creado exitosamente!');
  } catch (error) {
    console.error('Error:', error);
    showError('Error al crear el curso. Por favor, intenta nuevamente.');
  }
}

// Utilidades
function showError(message) {
  const courseGrid = document.getElementById('courseGrid');
  if (courseGrid) {
    courseGrid.innerHTML = `<div class="col-span-full text-center text-red-500">${message}</div>`;
  }
}

function showSuccess(message) {
  alert(message);
}

// Dummy for missing function to avoid JS errors
window.showCourseDetails = function(id) {
  alert('Función de detalles de curso aún no implementada.');
};

// Mostrar errores JS globales en pantalla
window.addEventListener('error', function(event) {
  showError('Error de JavaScript: ' + event.message);
});

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', initialize); 