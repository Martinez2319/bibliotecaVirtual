require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Modelos
const User = require('./models/User');
const Book = require('./models/Book');
const Category = require('./models/Category');

// Rutas
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const paypalRoutes = require('./routes/paypal');
const remoteRoutes = require('./routes/remote');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth Middleware
app.use(async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
    } catch (e) {
      req.user = null;
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/remote', remoteRoutes);

// Stats (admin)
app.get('/api/stats', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const [totalBooks, totalUsers, totalCategories] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments(),
      Category.countDocuments()
    ]);
    res.json({ totalBooks, totalUsers, totalCategories });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Seed data
app.post('/api/seed', async (req, res) => {
  try {
    if (await Book.countDocuments() > 0) return res.json({ message: 'Ya hay datos' });

    const hash = await bcrypt.hash('admin123', 10);
    await User.create({ name: 'Administrador', email: 'admin@biblioteca.com', passwordHash: hash, role: 'admin' });

    await Category.insertMany([
      { name: 'Ficción', slug: 'ficcion', description: 'Novelas y cuentos' },
      { name: 'Ciencia Ficción', slug: 'ciencia-ficcion', description: 'Futuros y tecnología' },
      { name: 'Romance', slug: 'romance', description: 'Historias de amor' },
      { name: 'Misterio', slug: 'misterio', description: 'Thrillers y detective' },
      { name: 'Historia', slug: 'historia', description: 'Historia mundial' },
      { name: 'Tecnología', slug: 'tecnologia', description: 'Ciencia y programación' }
    ]);

    await Book.insertMany([
      { title: 'Cien Años de Soledad', author: 'Gabriel García Márquez', description: 'Obra maestra del realismo mágico.', categories: ['Ficción'], coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', content: 'Muchos años después, frente al pelotón de fusilamiento...', views: 1250 },
      { title: '1984', author: 'George Orwell', description: 'Novela distópica sobre un futuro totalitario.', categories: ['Ciencia Ficción', 'Ficción'], coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400', content: 'Era un día luminoso y frío de abril...', views: 980 },
      { title: 'El Principito', author: 'Antoine de Saint-Exupéry', description: 'Clásico sobre un pequeño príncipe.', categories: ['Ficción'], coverUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400', content: 'Una vez, cuando tenía seis años...', views: 1500 },
      { title: 'Don Quijote', author: 'Miguel de Cervantes', description: 'La obra maestra española.', categories: ['Ficción', 'Historia'], coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400', content: 'En un lugar de la Mancha...', views: 750 }
    ]);

    res.json({ message: 'Datos creados', books: 4, categories: 6 });
  } catch (e) {
    res.status(500).json({ error: 'Error al crear datos iniciales' });
  }
});

// HTML Routes
const htmlPath = p => path.join(__dirname, 'public/html', p);
app.get('/', (req, res) => res.sendFile(htmlPath('index.html')));
app.get('/login', (req, res) => res.sendFile(htmlPath('login.html')));
app.get('/register', (req, res) => res.sendFile(htmlPath('register.html')));
app.get('/catalog', (req, res) => res.sendFile(htmlPath('catalog.html')));
app.get('/book/:id', (req, res) => res.sendFile(htmlPath('book.html')));
app.get('/reader/:id', (req, res) => res.sendFile(htmlPath('reader.html')));
app.get('/dashboard', (req, res) => res.sendFile(htmlPath('dashboard.html')));

// 404 & Error handler
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
mongoose.connect(`${process.env.MONGO_URL}/${process.env.DB_NAME}`)
  .then(() => {
    console.log('✅ MongoDB conectado');
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
  });