# 📚 Biblioteca Virtual

Sistema de biblioteca digital con Node.js, Express y MongoDB.

## ✨ Características

- 📖 **Catálogo de libros** con búsqueda y filtros
- 👤 **Sistema de usuarios** (registro, login, roles)
- 🔐 **Panel de administración** para gestionar contenido
- 📄 **Lector integrado** (PDF y texto)
- 💝 **Donaciones** con PayPal
- 🖥️ **API para PC remoto** - Sirve libros desde tu computadora

## 🚀 Instalación

### 1. Requisitos
- Node.js 18+
- MongoDB (local o Atlas)

### 2. Configurar
```bash
# Clonar e instalar
npm install

# Copiar configuración
cp .env
# Editar .env con tus credenciales
```

### 3. Ejecutar
```bash
npm start
```

Visita: http://localhost:3000

## 🖥️ API para PC Remoto

Permite servir PDFs y portadas desde tu PC Windows.

### Configuración:
1. Copia la carpeta `pc-server/` a tu PC
2. Edita `config.json` con tu API key y URL del servidor
3. Ejecuta `iniciar.bat`

### Uso en libros:
- **Portada**: `remote:mi-imagen.jpg`
- **PDF**: `remote:mi-libro.pdf`

Ver más detalles en `pc-server/README.md`

## 📁 Estructura

```
biblioteca-virtual/
├── models/           # Modelos MongoDB
├── routes/           # API endpoints
├── public/           # Frontend (HTML/CSS/JS)
├── pc-server/        # Programa para PC Windows
├── server.js         # Servidor principal
└── .env              # Configuración
```

## 🔑 Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `MONGO_URL` | URL de MongoDB |
| `DB_NAME` | Nombre de la base de datos |
| `JWT_SECRET` | Clave para tokens JWT |
| `PAYPAL_CLIENT_ID` | Client ID de PayPal (opcional) |
| `PAYPAL_SECRET` | Secret de PayPal (opcional) |
| `REMOTE_API_KEY` | API key para el PC remoto |

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Usuario actual

### Libros
- `GET /api/books` - Listar libros
- `GET /api/books/featured` - Libros destacados
- `GET /api/books/recent` - Libros recientes
- `GET /api/books/:id` - Obtener libro
- `POST /api/books` - Crear libro (admin)
- `PUT /api/books/:id` - Actualizar libro (admin)
- `DELETE /api/books/:id` - Eliminar libro (admin)

### PC Remoto
- `POST /api/remote/register` - Registrar PC
- `GET /api/remote/status` - Estado del PC
- `GET /api/remote/files` - Listar archivos
- `GET /api/remote/file/:type/:filename` - Obtener archivo

## 👤 Usuario Admin por Defecto

```
Email: admin@biblioteca.com
Password: admin123
```

(Se crea automáticamente al ejecutar seed)

## 📄 Licencia

MIT