const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3001;

const JWT_SECRET = 'supersecretkey'; // Cambia esto en producción

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// SQLite DB setup
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    studied INTEGER DEFAULT 0,
    meditated INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' -- 'student' o 'teacher'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    teacher_id INTEGER NOT NULL,
    image TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT,
    position INTEGER,
    FOREIGN KEY (module_id) REFERENCES modules(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    file_url TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    grade TEXT,
    feedback TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS forums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forum_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER,
    FOREIGN KEY (forum_id) REFERENCES forums(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    course_id INTEGER,
    user_id INTEGER,
    type TEXT,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    date_awarded TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (badge_id) REFERENCES badges(id)
  )`);
});

// API Endpoints
// Get all videos
app.get('/api/videos', (req, res) => {
  db.all('SELECT * FROM videos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new video
app.post('/api/videos', (req, res) => {
  const { title, description, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL required' });
  db.run('INSERT INTO videos (title, description, url) VALUES (?, ?, ?)', [title, description, url], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, title, description, url });
  });
});

// Get habits for a date (default: today)
app.get('/api/habits', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  db.get('SELECT * FROM habits WHERE date = ?', [date], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      // If no row, create default
      db.run('INSERT INTO habits (date, studied, meditated) VALUES (?, 0, 0)', [date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, date, studied: 0, meditated: 0 });
      });
    } else {
      res.json(row);
    }
  });
});

// Update habits for a date
app.post('/api/habits', (req, res) => {
  const { date, studied, meditated } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });
  db.run('UPDATE habits SET studied = ?, meditated = ? WHERE date = ?', [studied, meditated, date], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ date, studied, meditated });
  });
});

// Middleware para verificar JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Middleware para verificar rol docente
function requireTeacher(req, res, next) {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  next();
}

// Registro
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  const hashed = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed], function(err) {
    if (err) return res.status(400).json({ error: 'Email ya registrado' });
    const user = { id: this.lastID, name, email, role: 'student' };
    const token = jwt.sign(user, JWT_SECRET);
    res.json({ token, user });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Credenciales inválidas' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

// Endpoint para que un admin cambie el rol de un usuario a docente
app.post('/api/users/:id/role', authenticateToken, (req, res) => {
  // Solo admin puede cambiar roles (puedes mejorar esto agregando un rol 'admin')
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { id } = req.params;
  const { role } = req.body;
  if (!['student', 'teacher'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- CURSOS ---
// Crear curso (solo docente)
app.post('/api/courses', authenticateToken, requireTeacher, (req, res) => {
  const { title, description, image } = req.body;
  const teacher_id = req.user.id;
  db.run('INSERT INTO courses (title, description, teacher_id, image) VALUES (?, ?, ?, ?)', [title, description, teacher_id, image], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, title, description, teacher_id, image });
  });
});

// Listar todos los cursos
app.get('/api/courses', authenticateToken, (req, res) => {
  db.all('SELECT courses.*, users.name as teacher_name FROM courses JOIN users ON courses.teacher_id = users.id', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Ver detalle de curso
app.get('/api/courses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.get('SELECT courses.*, users.name as teacher_name FROM courses JOIN users ON courses.teacher_id = users.id WHERE courses.id = ?', [id], (err, course) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(course);
  });
});

// Editar curso (solo docente propietario)
app.put('/api/courses/:id', authenticateToken, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { title, description, image } = req.body;
  db.get('SELECT * FROM courses WHERE id = ?', [id], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
    if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    db.run('UPDATE courses SET title = ?, description = ?, image = ? WHERE id = ?', [title, description, image, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Eliminar curso (solo docente propietario)
app.delete('/api/courses/:id', authenticateToken, requireTeacher, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM courses WHERE id = ?', [id], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
    if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    db.run('DELETE FROM courses WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// --- INSCRIPCIONES ---
// Inscribirse a un curso (solo estudiante)
app.post('/api/courses/:id/enroll', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Solo estudiantes pueden inscribirse' });
  const course_id = req.params.id;
  const user_id = req.user.id;
  db.get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [user_id, course_id], (err, row) => {
    if (row) return res.status(400).json({ error: 'Ya inscrito' });
    db.run('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [user_id, course_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Desinscribirse de un curso (solo estudiante)
app.delete('/api/courses/:id/enroll', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Solo estudiantes pueden desinscribirse' });
  const course_id = req.params.id;
  const user_id = req.user.id;
  db.run('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?', [user_id, course_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Listar cursos inscritos por usuario
app.get('/api/my-courses', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  db.all('SELECT courses.*, users.name as teacher_name FROM enrollments JOIN courses ON enrollments.course_id = courses.id JOIN users ON courses.teacher_id = users.id WHERE enrollments.user_id = ?', [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- MÓDULOS ---
// Crear módulo (solo docente del curso)
app.post('/api/courses/:courseId/modules', authenticateToken, requireTeacher, (req, res) => {
  const { courseId } = req.params;
  const { title, description, position } = req.body;
  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
    if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    db.run('INSERT INTO modules (course_id, title, description, position) VALUES (?, ?, ?, ?)', [courseId, title, description, position], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, course_id: courseId, title, description, position });
    });
  });
});

// Listar módulos de un curso
app.get('/api/courses/:courseId/modules', authenticateToken, (req, res) => {
  const { courseId } = req.params;
  db.all('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC', [courseId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Editar módulo (solo docente del curso)
app.put('/api/modules/:id', authenticateToken, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { title, description, position } = req.body;
  db.get('SELECT * FROM modules WHERE id = ?', [id], (err, module) => {
    if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
    db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
      if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
      if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
      db.run('UPDATE modules SET title = ?, description = ?, position = ? WHERE id = ?', [title, description, position, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

// Eliminar módulo (solo docente del curso)
app.delete('/api/modules/:id', authenticateToken, requireTeacher, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM modules WHERE id = ?', [id], (err, module) => {
    if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
    db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
      if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
      if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
      db.run('DELETE FROM modules WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

// --- LECCIONES ---
// Crear lección (solo docente del curso)
app.post('/api/modules/:moduleId/lessons', authenticateToken, requireTeacher, (req, res) => {
  const { moduleId } = req.params;
  const { title, content, video_url, position } = req.body;
  db.get('SELECT * FROM modules WHERE id = ?', [moduleId], (err, module) => {
    if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
    db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
      if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
      if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
      db.run('INSERT INTO lessons (module_id, title, content, video_url, position) VALUES (?, ?, ?, ?, ?)', [moduleId, title, content, video_url, position], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, module_id: moduleId, title, content, video_url, position });
      });
    });
  });
});

// Listar lecciones de un módulo
app.get('/api/modules/:moduleId/lessons', authenticateToken, (req, res) => {
  const { moduleId } = req.params;
  db.all('SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC', [moduleId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Editar lección (solo docente del curso)
app.put('/api/lessons/:id', authenticateToken, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { title, content, video_url, position } = req.body;
  db.get('SELECT * FROM lessons WHERE id = ?', [id], (err, lesson) => {
    if (err || !lesson) return res.status(404).json({ error: 'Lección no encontrada' });
    db.get('SELECT * FROM modules WHERE id = ?', [lesson.module_id], (err, module) => {
      if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
      db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
        if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
        if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
        db.run('UPDATE lessons SET title = ?, content = ?, video_url = ?, position = ? WHERE id = ?', [title, content, video_url, position, id], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      });
    });
  });
});

// Eliminar lección (solo docente del curso)
app.delete('/api/lessons/:id', authenticateToken, requireTeacher, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM lessons WHERE id = ?', [id], (err, lesson) => {
    if (err || !lesson) return res.status(404).json({ error: 'Lección no encontrada' });
    db.get('SELECT * FROM modules WHERE id = ?', [lesson.module_id], (err, module) => {
      if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
      db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
        if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
        if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
        db.run('DELETE FROM lessons WHERE id = ?', [id], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      });
    });
  });
});

// --- PROGRESO DEL ESTUDIANTE ---
// Marcar lección como completada (solo estudiante)
app.post('/api/lessons/:lessonId/complete', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Solo estudiantes pueden marcar progreso' });
  const user_id = req.user.id;
  const { lessonId } = req.params;
  db.get('SELECT * FROM progress WHERE user_id = ? AND lesson_id = ?', [user_id, lessonId], (err, row) => {
    if (row) {
      db.run('UPDATE progress SET completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [row.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    } else {
      db.run('INSERT INTO progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)', [user_id, lessonId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    }
  });
});

// Consultar progreso del estudiante en un curso
app.get('/api/courses/:courseId/progress', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Solo estudiantes pueden consultar progreso' });
  const user_id = req.user.id;
  const { courseId } = req.params;
  // Obtener todas las lecciones del curso
  db.all('SELECT lessons.id as lesson_id FROM modules JOIN lessons ON modules.id = lessons.module_id WHERE modules.course_id = ?', [courseId], (err, lessons) => {
    if (err) return res.status(500).json({ error: err.message });
    const lessonIds = lessons.map(l => l.lesson_id);
    if (lessonIds.length === 0) return res.json({ total: 0, completed: 0, percent: 0 });
    db.all('SELECT * FROM progress WHERE user_id = ? AND lesson_id IN (' + lessonIds.map(() => '?').join(',') + ') AND completed = 1', [user_id, ...lessonIds], (err, completedRows) => {
      if (err) return res.status(500).json({ error: err.message });
      const completed = completedRows.length;
      const total = lessonIds.length;
      const percent = Math.round((completed / total) * 100);
      res.json({ total, completed, percent });
    });
  });
});

// --- TAREAS Y ENTREGAS ---
// Crear tarea (solo docente del curso)
app.post('/api/lessons/:lessonId/tasks', authenticateToken, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const { title, description, due_date } = req.body;
  db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
    if (err || !lesson) return res.status(404).json({ error: 'Lección no encontrada' });
    db.get('SELECT * FROM modules WHERE id = ?', [lesson.module_id], (err, module) => {
      if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
      db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
        if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
        if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
        db.run('INSERT INTO tasks (lesson_id, title, description, due_date) VALUES (?, ?, ?, ?)', [lessonId, title, description, due_date], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID, lesson_id: lessonId, title, description, due_date });
        });
      });
    });
  });
});

// Listar tareas de una lección
app.get('/api/lessons/:lessonId/tasks', authenticateToken, (req, res) => {
  const { lessonId } = req.params;
  db.all('SELECT * FROM tasks WHERE lesson_id = ?', [lessonId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Entregar tarea (solo estudiante)
app.post('/api/tasks/:taskId/submit', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Solo estudiantes pueden entregar tareas' });
  const { taskId } = req.params;
  const { file_url } = req.body;
  const user_id = req.user.id;
  db.get('SELECT * FROM submissions WHERE task_id = ? AND user_id = ?', [taskId, user_id], (err, row) => {
    if (row) return res.status(400).json({ error: 'Ya entregada' });
    db.run('INSERT INTO submissions (task_id, user_id, file_url) VALUES (?, ?, ?)', [taskId, user_id, file_url], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, task_id: taskId, user_id, file_url });
    });
  });
});

// Listar entregas de una tarea (solo docente del curso)
app.get('/api/tasks/:taskId/submissions', authenticateToken, requireTeacher, (req, res) => {
  const { taskId } = req.params;
  db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
    if (err || !task) return res.status(404).json({ error: 'Tarea no encontrada' });
    db.get('SELECT * FROM lessons WHERE id = ?', [task.lesson_id], (err, lesson) => {
      if (err || !lesson) return res.status(404).json({ error: 'Lección no encontrada' });
      db.get('SELECT * FROM modules WHERE id = ?', [lesson.module_id], (err, module) => {
        if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
        db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
          if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
          if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
          db.all('SELECT submissions.*, users.name as student_name FROM submissions JOIN users ON submissions.user_id = users.id WHERE submissions.task_id = ?', [taskId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
          });
        });
      });
    });
  });
});

// Calificar entrega (solo docente del curso)
app.post('/api/submissions/:submissionId/grade', authenticateToken, requireTeacher, (req, res) => {
  const { submissionId } = req.params;
  const { grade, feedback } = req.body;
  db.get('SELECT * FROM submissions WHERE id = ?', [submissionId], (err, submission) => {
    if (err || !submission) return res.status(404).json({ error: 'Entrega no encontrada' });
    db.get('SELECT * FROM tasks WHERE id = ?', [submission.task_id], (err, task) => {
      if (err || !task) return res.status(404).json({ error: 'Tarea no encontrada' });
      db.get('SELECT * FROM lessons WHERE id = ?', [task.lesson_id], (err, lesson) => {
        if (err || !lesson) return res.status(404).json({ error: 'Lección no encontrada' });
        db.get('SELECT * FROM modules WHERE id = ?', [lesson.module_id], (err, module) => {
          if (err || !module) return res.status(404).json({ error: 'Módulo no encontrado' });
          db.get('SELECT * FROM courses WHERE id = ?', [module.course_id], (err, course) => {
            if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
            if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
            db.run('UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?', [grade, feedback, submissionId], function(err) {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ success: true });
            });
          });
        });
      });
    });
  });
});

// --- FOROS Y COMENTARIOS ---
// Crear foro (solo docente del curso)
app.post('/api/courses/:courseId/forums', authenticateToken, requireTeacher, (req, res) => {
  const { courseId } = req.params;
  const { title } = req.body;
  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
    if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    db.run('INSERT INTO forums (course_id, title) VALUES (?, ?)', [courseId, title], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, course_id: courseId, title });
    });
  });
});

// Listar foros de un curso
app.get('/api/courses/:courseId/forums', authenticateToken, (req, res) => {
  const { courseId } = req.params;
  db.all('SELECT * FROM forums WHERE course_id = ?', [courseId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear comentario/hilo en un foro
app.post('/api/forums/:forumId/comments', authenticateToken, (req, res) => {
  const { forumId } = req.params;
  const { content, parent_id } = req.body;
  const user_id = req.user.id;
  db.get('SELECT * FROM forums WHERE id = ?', [forumId], (err, forum) => {
    if (err || !forum) return res.status(404).json({ error: 'Foro no encontrado' });
    db.run('INSERT INTO comments (forum_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)', [forumId, user_id, content, parent_id || null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, forum_id: forumId, user_id, content, parent_id: parent_id || null });
    });
  });
});

// Listar comentarios de un foro (hilos y respuestas)
app.get('/api/forums/:forumId/comments', authenticateToken, (req, res) => {
  const { forumId } = req.params;
  db.all('SELECT comments.*, users.name as user_name FROM comments JOIN users ON comments.user_id = users.id WHERE forum_id = ? ORDER BY created_at ASC', [forumId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- EVENTOS (CALENDARIO) ---
// Crear evento de curso (solo docente del curso)
app.post('/api/courses/:courseId/events', authenticateToken, requireTeacher, (req, res) => {
  const { courseId } = req.params;
  const { title, description, date, type } = req.body;
  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Curso no encontrado' });
    if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    db.run('INSERT INTO events (title, description, date, course_id, type) VALUES (?, ?, ?, ?, ?)', [title, description, date, courseId, type || 'curso'], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, title, description, date, course_id: courseId, type: type || 'curso' });
    });
  });
});

// Crear evento personal (solo estudiante)
app.post('/api/events/personal', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Solo estudiantes pueden crear eventos personales' });
  const { title, description, date, type } = req.body;
  const user_id = req.user.id;
  db.run('INSERT INTO events (title, description, date, user_id, type) VALUES (?, ?, ?, ?, ?)', [title, description, date, user_id, type || 'personal'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, title, description, date, user_id, type: type || 'personal' });
  });
});

// Listar eventos de usuario (personales y de cursos inscritos)
app.get('/api/my-events', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  // Eventos personales
  db.all('SELECT * FROM events WHERE user_id = ?', [user_id], (err, personalEvents) => {
    if (err) return res.status(500).json({ error: err.message });
    // Eventos de cursos inscritos
    db.all('SELECT course_id FROM enrollments WHERE user_id = ?', [user_id], (err, enrollments) => {
      if (err) return res.status(500).json({ error: err.message });
      const courseIds = enrollments.map(e => e.course_id);
      if (courseIds.length === 0) return res.json(personalEvents);
      db.all('SELECT * FROM events WHERE course_id IN (' + courseIds.map(() => '?').join(',') + ')', courseIds, (err, courseEvents) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json([...personalEvents, ...courseEvents]);
      });
    });
  });
});

// Listar eventos de un curso
app.get('/api/courses/:courseId/events', authenticateToken, (req, res) => {
  const { courseId } = req.params;
  db.all('SELECT * FROM events WHERE course_id = ?', [courseId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- BADGES ---
// Listar todos los badges disponibles
app.get('/api/badges', authenticateToken, (req, res) => {
  db.all('SELECT * FROM badges', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Listar badges obtenidos por usuario
app.get('/api/my-badges', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  db.all('SELECT badges.*, user_badges.date_awarded FROM user_badges JOIN badges ON user_badges.badge_id = badges.id WHERE user_badges.user_id = ?', [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Lógica automática: asignar badge al completar un curso (progreso 100%)
app.post('/api/courses/:courseId/check-badges', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Solo estudiantes pueden obtener badges' });
  const user_id = req.user.id;
  const { courseId } = req.params;
  // Verificar progreso
  db.all('SELECT lessons.id as lesson_id FROM modules JOIN lessons ON modules.id = lessons.module_id WHERE modules.course_id = ?', [courseId], (err, lessons) => {
    if (err) return res.status(500).json({ error: err.message });
    const lessonIds = lessons.map(l => l.lesson_id);
    if (lessonIds.length === 0) return res.json({ awarded: false });
    db.all('SELECT * FROM progress WHERE user_id = ? AND lesson_id IN (' + lessonIds.map(() => '?').join(',') + ') AND completed = 1', [user_id, ...lessonIds], (err, completedRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (completedRows.length === lessonIds.length) {
        // Buscar badge de "Curso completado"
        db.get('SELECT * FROM badges WHERE name = ?', ['Curso completado'], (err, badge) => {
          if (!badge) return res.json({ awarded: false });
          // Verificar si ya lo tiene
          db.get('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?', [user_id, badge.id], (err, userBadge) => {
            if (userBadge) return res.json({ awarded: false });
            db.run('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [user_id, badge.id], function(err) {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ awarded: true, badge });
            });
          });
        });
      } else {
        res.json({ awarded: false });
      }
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});