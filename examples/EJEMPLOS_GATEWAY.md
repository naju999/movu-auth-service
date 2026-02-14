# 🌐 Ejemplo de Configuración del Gateway

Este documento muestra ejemplos de cómo configurar el Gateway para trabajar con el Auth Service.

## 📦 Opción 1: Gateway con Express.js

### Instalación de dependencias

```bash
npm install express http-proxy-middleware
```

### Estructura del proyecto Gateway

```
movu-gateway/
├── package.json
├── server.js
└── public/
    ├── login.html
    ├── index.html
    └── auth-client.js
```

### Código del Gateway (server.js)

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 8080;

// Configuración de CORS (si es necesario)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// PROXY PARA AUTH SERVICE (Puerto 8081)
// ============================================
app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:8081',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📤 Proxying: ${req.method} ${req.path} → Auth Service`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`📥 Response: ${proxyRes.statusCode} from Auth Service`);
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err);
    res.status(500).json({ 
      error: 'Error al conectar con el servicio de autenticación',
      message: err.message 
    });
  }
}));

// ============================================
// PROXY PARA OTROS SERVICIOS (si los tienes)
// ============================================

// Ejemplo: Servicio de viajes (puerto 8082)
// app.use('/api/trips', createProxyMiddleware({
//   target: 'http://localhost:8082',
//   changeOrigin: true
// }));

// Ejemplo: Servicio de usuarios (puerto 8083)
// app.use('/api/users', createProxyMiddleware({
//   target: 'http://localhost:8083',
//   changeOrigin: true
// }));

// ============================================
// RUTAS CATCH-ALL
// ============================================

// Ruta de salud del gateway
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ruta por defecto (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} not found`,
    availableRoutes: {
      frontend: ['/login.html', '/index.html'],
      api: ['/api/auth/*']
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('==============================================');
  console.log(`🌐 Gateway running on http://localhost:${PORT}`);
  console.log('==============================================');
  console.log('Frontend URLs:');
  console.log(`  📄 Login: http://localhost:${PORT}/login.html`);
  console.log(`  📄 Index: http://localhost:${PORT}/index.html`);
  console.log('');
  console.log('API Proxies:');
  console.log(`  🔐 Auth: http://localhost:${PORT}/api/auth/* → http://localhost:8081/api/auth/*`);
  console.log('==============================================');
});

// Manejo de errores
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// Cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  process.exit(0);
});
```

### package.json del Gateway

```json
{
  "name": "movu-gateway",
  "version": "1.0.0",
  "description": "Gateway para el sistema Movu",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 📦 Opción 2: Gateway con Nginx

### Archivo de configuración (nginx.conf)

```nginx
# nginx.conf

worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # Logging
    access_log logs/access.log;
    error_log logs/error.log;

    # Timeouts
    keepalive_timeout 65;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Server principal
    server {
        listen 8080;
        server_name localhost;

        # Servir archivos estáticos
        location / {
            root html;
            index index.html login.html;
            try_files $uri $uri/ =404;
        }

        # Archivos específicos
        location = /login.html {
            root html;
        }

        location = /index.html {
            root html;
        }

        # Proxy para Auth Service
        location /api/auth/ {
            proxy_pass http://localhost:8081/api/auth/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
            
            # Preflight
            if ($request_method = 'OPTIONS') {
                return 204;
            }
        }

        # Proxy para otros servicios (ejemplo)
        # location /api/trips/ {
        #     proxy_pass http://localhost:8082/api/trips/;
        #     proxy_set_header Host $host;
        #     proxy_set_header X-Real-IP $remote_addr;
        #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # }

        # Health check
        location /health {
            return 200 '{"status":"healthy","service":"gateway"}';
            add_header Content-Type application/json;
        }
    }
}
```

### Comandos para usar Nginx

```bash
# Iniciar Nginx
nginx

# Recargar configuración
nginx -s reload

# Detener Nginx
nginx -s stop

# Verificar configuración
nginx -t
```

---

## 📦 Opción 3: Gateway con Node.js puro (sin Express)

```javascript
const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const proxy = httpProxy.createProxyServer({});

// Tipos MIME
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Proxy para Auth Service
  if (req.url.startsWith('/api/auth')) {
    proxy.web(req, res, {
      target: 'http://localhost:8081',
      changeOrigin: true
    });
    return;
  }

  // Servir archivos estáticos
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'login.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});
```

---

## 🚀 Iniciar el Gateway

### Con Express:

```bash
# Instalar dependencias
npm install

# Iniciar el gateway
npm start

# O con nodemon para desarrollo
npm run dev
```

### Con Nginx:

```bash
# Copiar archivos HTML a la carpeta html/ de Nginx
cp login.html index.html /path/to/nginx/html/

# Iniciar Nginx
nginx
```

---

## 📁 Archivos que necesitas copiar al Gateway

Copia estos archivos del auth-service al gateway:

```bash
# Desde el directorio movu-auth-service

# Copiar al directorio public del gateway Express
Copy-Item .\examples\login.html -Destination ..\movu-gateway\public\
Copy-Item .\examples\index.html -Destination ..\movu-gateway\public\
Copy-Item .\examples\auth-client.js -Destination ..\movu-gateway\public\

# O para Nginx (copiar a la carpeta html/)
Copy-Item .\examples\login.html -Destination C:\nginx\html\
Copy-Item .\examples\index.html -Destination C:\nginx\html\
Copy-Item .\examples\auth-client.js -Destination C:\nginx\html\
```

---

## ✅ Verificación del Gateway

### 1. Verificar que está corriendo:

```powershell
curl http://localhost:8080/health
```

### 2. Verificar archivos estáticos:

```powershell
curl http://localhost:8080/login.html
curl http://localhost:8080/index.html
```

### 3. Verificar proxy al auth service:

```powershell
curl http://localhost:8080/api/auth/verify
```

---

## 🎯 Resumen

El Gateway necesita:

1. ✅ Servir archivos estáticos (login.html, index.html)
2. ✅ Hacer proxy de `/api/auth/*` a `http://localhost:8081/api/auth/*`
3. ✅ Correr en el puerto 8080
4. ✅ Permitir CORS desde el auth service

**¡Eso es todo!** Elige la opción que prefieras y configura tu gateway. 🚀
