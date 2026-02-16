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
const chatRoutes = require('./routes/chat');
const paypalRoutes = require('./routes/paypal');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
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
app.use('/api/chat', chatRoutes);
app.use('/api/paypal', paypalRoutes);

// Stats (admin)
app.get('/api/stats', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const [totalBooks, totalUsers, totalCategories] = await Promise.all([
    Book.countDocuments(),
    User.countDocuments(),
    Category.countDocuments()
  ]);
  res.json({ totalBooks, totalUsers, totalCategories });
});

// Seed data
app.post('/api/seed', async (req, res) => {
  try {
    const exists = await Book.countDocuments();
    if (exists > 0) return res.json({ message: 'Ya hay datos' });

    // Admin
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({ name: 'Administrador', email: 'admin@biblioteca.com', passwordHash: hash, role: 'admin' });

    // Categorías
    await Category.insertMany([
      { name: 'Ficción', slug: 'ficcion', description: 'Novelas y cuentos' },
      { name: 'Ciencia Ficción', slug: 'ciencia-ficcion', description: 'Futuros y tecnología' },
      { name: 'Romance', slug: 'romance', description: 'Historias de amor' },
      { name: 'Misterio', slug: 'misterio', description: 'Thrillers y detective' },
      { name: 'Historia', slug: 'historia', description: 'Historia mundial' },
      { name: 'Tecnología', slug: 'tecnologia', description: 'Ciencia y programación' }
    ]);

    // Libros
    await Book.insertMany([
      { title: 'Cien Años de Soledad', author: 'Gabriel García Márquez', description: 'Obra maestra del realismo mágico.', categories: ['Ficción'], coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', content: 'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo...', views: 1250 },
      { title: '1984', author: 'George Orwell', description: 'Novela distópica sobre un futuro totalitario.', categories: ['Ciencia Ficción', 'Ficción'], coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400', content: 'Era un día luminoso y frío de abril y los relojes daban las trece...', views: 980 },
      { title: 'El Principito', author: 'Antoine de Saint-Exupéry', description: 'Clásico sobre un pequeño príncipe.', categories: ['Ficción'], coverUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400', content: 'Una vez, cuando tenía seis años, vi una magnífica estampa...', views: 1500 },
      { title: 'Don Quijote', author: 'Miguel de Cervantes', description: 'La obra maestra española.', categories: ['Ficción', 'Historia'], coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400', content: 'En un lugar de la Mancha, de cuyo nombre no quiero acordarme...', views: 750 },
      { title: 'Orgullo y Prejuicio', author: 'Jane Austen', description: 'Novela de costumbres inglesas.', categories: ['Romance', 'Ficción'], coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400', content: 'Es una verdad mundialmente reconocida que un hombre soltero...', views: 890 },
      { title: 'Sherlock Holmes', author: 'Arthur Conan Doyle', description: 'El detective más famoso.', categories: ['Misterio'], coverUrl: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400', content: 'El señor Sherlock Holmes se levantaba tarde por las mañanas...', views: 720 },
      { title: 'Dune', author: 'Frank Herbert', description: 'Épica de ciencia ficción.', categories: ['Ciencia Ficción'], coverUrl: 'https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?w=400', content: 'En la semana antes de su partida a Arrakis...', views: 620 },
      { title: 'Inteligencia Artificial', author: 'Stuart Russell', description: 'Guía moderna sobre IA.', categories: ['Tecnología'], coverUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400', content: 'La inteligencia artificial es un campo de la informática...', views: 450 }
    ]);

    res.json({ message: 'Datos creados', books: 8, categories: 6 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/html/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/html/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/html/register.html')));
app.get('/catalog', (req, res) => res.sendFile(path.join(__dirname, 'public/html/catalog.html')));
app.get('/book/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/html/book.html')));
app.get('/reader/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/html/reader.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/html/dashboard.html')));

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
