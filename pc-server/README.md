"# 🚀 GUÍA RÁPIDA - Cloudflared

## Instalación (Solo una vez)

**Instalar cloudflared:**
```bash
winget install --id Cloudflare.cloudflared
```

## Uso Diario (Cada vez que quieras usar la biblioteca)

### 1. Abre Terminal 1 y ejecuta:
```bash
cloudflared tunnel --url http://localhost:3001
```

**Verás algo como:**
```
Your quick Tunnel has been created! Visit it at:
https://abc-xyz-123.trycloudflare.com
```

**📋 COPIA ESA URL**

---

### 2. Abre Terminal 2 (en la carpeta pc-server):

**Doble clic en:** `iniciar.bat`

**Cuando te pida la URL, pégala:**
```
Pega aqui tu URL de Cloudflare: https://abc-xyz-123.trycloudflare.com
```

---

## ✅ Listo!

Verás:
```
✅ Registrado con el servidor principal
💓 Heartbeat activo
✅ Servidor corriendo
```

Tu biblioteca ahora puede acceder a los archivos de tu PC.

---

## 📁 Archivos

Pon tus libros en:
```
C:\MisLibros\
  ├── pdfs\          ← Tus PDFs aquí
  └── covers\        ← Tus portadas aquí
```

---

## ⚠️ Importante

- Mantén ambas terminales abiertas
- Tu PC debe estar encendida
- Actualiza `config.json` con tu API key

---

## 🔧 Config.json

```json
{
  \"apiKey\": \"TU_API_KEY\",
  \"serverUrl\": \"https://tu-biblioteca.com\",
  \"booksFolder\": \"C:\\MisLibros\",
  \"localPort\": 3001,
  \"pcName\": \"Mi PC\"
}
```

La `apiKey` debe coincidir con `REMOTE_API_KEY` en tu servidor.

---

**Eso es todo!** 🎉
"