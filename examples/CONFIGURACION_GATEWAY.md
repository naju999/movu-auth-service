# 🔐 Configuración completa de Google OAuth 2.0 con Gateway

## 📋 Resumen

Este documento explica la configuración necesaria para integrar el **Auth Service** (puerto 8081) con el **Gateway** (puerto 8080) usando Google OAuth 2.0.

## 🏗️ Arquitectura

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│   Usuario   │─────▶│   Gateway   │─────▶│  Auth Service    │
│  Navegador  │◀─────│ Puerto 8080 │◀─────│  Puerto 8081     │
└─────────────┘      └─────────────┘      └──────────────────┘
                            │                       │
                            │                       │
                            ▼                       ▼
                     ┌─────────────┐      ┌──────────────┐
                     │ login.html  │      │  Google      │
                     │ index.html  │      │  OAuth API   │
                     └─────────────┘      └──────────────┘
```

## ✅ Checklist de Configuración

### 1. Auth Service (Puerto 8081)

#### ✅ Variables de entorno configuradas

El archivo `.env` ya está correctamente configurado:

```env
# Server
PORT=8081

# Google OAuth 2.0
GOOGLE_CLIENT_ID=900085950768-erc4gn3m8hpahho0f73g1p1bvl8nk4f0.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:8081/api/auth/google/callback

# Frontend URL (Gateway)
FRONTEND_URL=http://localhost:8080

# CORS (permitir Gateway)
CORS_ORIGIN=http://localhost:8080

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

#### ✅ Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/auth/google` | Inicia OAuth con Google |
| GET | `/api/auth/google/callback` | Callback de Google (automático) |
| GET | `/api/auth/verify` | Verifica validez del token |
| GET | `/api/auth/me` | Obtiene info del usuario actual |
| POST | `/api/auth/refresh` | Renueva el access token |
| POST | `/api/auth/logout` | Cierra sesión |

#### ✅ Iniciar el servicio

```powershell
# 1. Instalar dependencias (si no lo has hecho)
npm install

# 2. Ejecutar migraciones
npm run migrate

# 3. Ejecutar seeders (roles iniciales)
npm run seed

# 4. Iniciar el servicio
npm start
```

El servicio estará disponible en `http://localhost:8081`

---

### 2. Google Cloud Console

#### ⚠️ IMPORTANTE: Configurar URIs autorizadas

Debes configurar estas URIs en [Google Cloud Console](https://console.cloud.google.com/):

1. Ve a **APIs y servicios** → **Credenciales**
2. Edita tu **Client ID de OAuth 2.0**
3. Configura:

**Orígenes de JavaScript autorizados:**
```
http://localhost:8080
http://localhost:8081
```

**URIs de redirección autorizadas:**
```
http://localhost:8081/api/auth/google/callback
```

---

### 3. Gateway (Puerto 8080)

#### 🔧 Configuración del Proxy

El gateway debe hacer proxy de las rutas `/api/auth/*` al auth service.

**Opción A: Con Express + http-proxy-middleware**

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Servir archivos estáticos (login.html, index.html)
app.use(express.static('public'));

// Proxy para el Auth Service
app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:8081',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying:', req.method, req.path, '→ Auth Service');
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Error al conectar con el servicio de autenticación');
  }
}));

app.listen(8080, () => {
  console.log('Gateway running on http://localhost:8080');
});
```

**Opción B: Con Nginx**

```nginx
server {
    listen 8080;
    server_name localhost;

    # Servir archivos estáticos
    location / {
        root /path/to/public;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # Proxy para Auth Service
    location /api/auth/ {
        proxy_pass http://localhost:8081/api/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 📁 Archivos HTML del Frontend

Copia los archivos de ejemplo al gateway:

```powershell
# Desde el directorio del auth-service
# Copiar los ejemplos al directorio público del gateway

# Ejemplo:
Copy-Item .\examples\login.html -Destination ..\movu-gateway\public\
Copy-Item .\examples\index.html -Destination ..\movu-gateway\public\
Copy-Item .\examples\auth-client.js -Destination ..\movu-gateway\public\
```

Los archivos necesarios son:
- `login.html` - Página de login con botón de Google
- `index.html` - Página principal después del login
- `auth-client.js` - Cliente JavaScript para manejar autenticación

---

## 🔄 Flujo Completo de Autenticación

### Paso 1: Usuario accede al login
```
http://localhost:8080/login.html
```

### Paso 2: Usuario hace clic en "Iniciar sesión con Google"
```
Navegador → Gateway → Auth Service
GET http://localhost:8080/api/auth/google
    ↓ (proxy)
GET http://localhost:8081/api/auth/google
```

### Paso 3: Auth Service redirige a Google
```
Auth Service → Google OAuth
Redirige a: https://accounts.google.com/o/oauth2/v2/auth?...
```

### Paso 4: Usuario autoriza en Google
```
Google → Auth Service
GET http://localhost:8081/api/auth/google/callback?code=...
```

### Paso 5: Auth Service procesa y redirige con tokens
```
Auth Service → Gateway → Navegador
Redirige a: http://localhost:8080/index.html?token=...&refresh=...
```

### Paso 6: index.html captura y guarda tokens
```javascript
// El script en index.html captura los tokens de la URL
const token = urlParams.get('token');
const refreshToken = urlParams.get('refresh');

// Los guarda en localStorage
localStorage.setItem('access_token', token);
localStorage.setItem('refresh_token', refreshToken);
```

### Paso 7: Frontend obtiene información del usuario
```javascript
// Petición autenticada al auth service
fetch('http://localhost:8081/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

---

## 🧪 Pruebas

### 1. Verificar que el Auth Service está corriendo

```powershell
.\test-google-oauth.ps1
```

O manualmente:
```powershell
curl http://localhost:8081/health
```

### 2. Probar el flujo de login

1. Abre: `http://localhost:8080/login.html`
2. Haz clic en "Iniciar sesión con Google"
3. Autoriza la aplicación en Google
4. Deberías ser redirigido a: `http://localhost:8080/index.html`
5. Verifica que puedes ver tu información de usuario

### 3. Verificar token manualmente

```powershell
# Reemplaza TOKEN con tu token real
$token = "tu-token-aquí"
$headers = @{
    "Authorization" = "Bearer $token"
}

# Verificar token
Invoke-RestMethod -Uri "http://localhost:8081/api/auth/verify" -Headers $headers

# Obtener usuario
Invoke-RestMethod -Uri "http://localhost:8081/api/auth/me" -Headers $headers
```

---

## 🐛 Resolución de Problemas

### ❌ Error: "redirect_uri_mismatch"

**Causa:** La URI de callback no coincide con la configurada en Google Cloud.

**Solución:**
1. Verifica que `GOOGLE_CALLBACK_URL` en `.env` sea: `http://localhost:8081/api/auth/google/callback`
2. Verifica que esta misma URI esté en Google Cloud Console
3. Espera 5 minutos para que Google actualice la configuración

### ❌ Error: CORS

**Causa:** El gateway no está en la lista de orígenes permitidos.

**Solución:**
1. Verifica que `CORS_ORIGIN=http://localhost:8080` en `.env`
2. Reinicia el auth service: `npm start`

### ❌ Error: "Cannot GET /api/auth/google"

**Causa:** El gateway no está haciendo proxy correctamente.

**Solución:**
1. Verifica la configuración del proxy en tu gateway
2. Asegúrate de que el gateway está reenviando `/api/auth/*` a `http://localhost:8081/api/auth/*`

### ❌ El token no se guarda después del callback

**Causa:** El script en `index.html` no está capturando los parámetros de la URL.

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en JavaScript
3. Verifica que el código para capturar tokens esté presente en `index.html`

### ❌ Error: "User not found" o token inválido

**Causa:** El usuario no existe en la base de datos o el token expiró.

**Solución:**
1. Verifica que las migraciones estén ejecutadas: `npm run migrate`
2. Cierra sesión y vuelve a iniciar sesión
3. Verifica la configuración de `JWT_SECRET` en `.env`

---

## 📚 Recursos Adicionales

### Archivos de Ejemplo

Los siguientes archivos están disponibles en la carpeta `examples/`:

- `login.html` - Página de login completa con estilos
- `index.html` - Página principal con información del usuario
- `auth-client.js` - Cliente JavaScript reutilizable

### Documentación

- `GATEWAY_INTEGRATION.md` - Guía completa de integración
- `GOOGLE_OAUTH_SETUP.md` - Configuración de Google OAuth
- `test-google-oauth.ps1` - Script de pruebas automáticas

---

## 🚀 Siguientes Pasos

Una vez que tengas todo funcionando:

1. **Proteger rutas en otros servicios:**
   - Usa el endpoint `/api/auth/verify` para validar tokens
   - Incluye el header `Authorization: Bearer TOKEN` en todas las peticiones

2. **Implementar refresh de tokens:**
   - Detecta cuando el token expira (401)
   - Usa `/api/auth/refresh` para obtener un nuevo token
   - Reintenta la petición original

3. **Mejorar la experiencia de usuario:**
   - Guarda el estado del usuario en el frontend
   - Implementa un sistema de navegación
   - Agrega protección de rutas en el cliente

4. **Preparar para producción:**
   - Cambia `JWT_SECRET` a un valor seguro
   - Actualiza las URLs a tu dominio de producción
   - Configura HTTPS
   - Actualiza las URIs en Google Cloud Console

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs del auth service
2. Verifica la consola del navegador (F12)
3. Ejecuta el script de pruebas: `.\test-google-oauth.ps1`
4. Revisa este documento paso a paso

---

**¡Listo!** Tu servicio de autenticación con Google OAuth 2.0 está configurado y listo para usar. 🎉
