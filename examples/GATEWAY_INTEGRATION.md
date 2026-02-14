# Configuración OAuth 2.0 de Google con Gateway

## Resumen de la Arquitectura

- **Gateway**: Puerto 8080 (frontend y proxy)
- **Auth Service**: Puerto 8081 (backend de autenticación)
- **Frontend URLs**:
  - Login: `http://localhost:8080/login.html`
  - Index: `http://localhost:8080/index.html`

## Flujo de Autenticación

### 1. Usuario inicia sesión

El usuario accede a `http://localhost:8080/login.html` y hace clic en "Iniciar sesión con Google".

### 2. Redirección al Auth Service

El botón del login redirige al gateway, que debe hacer proxy a:
```
GET http://localhost:8081/api/auth/google
```

### 3. Google OAuth

El auth service redirige a Google para autenticación. Google pedirá permisos y luego redirigirá a:
```
GET http://localhost:8081/api/auth/google/callback?code=...
```

### 4. Procesamiento del Callback

El auth service:
- Verifica el código con Google
- Crea o actualiza el usuario en la base de datos
- Genera tokens JWT (access + refresh)
- Redirige al frontend: `http://localhost:8080/index.html?token=...&refresh=...`

### 5. Frontend recibe tokens

El `index.html` debe capturar los tokens de la URL y almacenarlos:

```javascript
// En index.html o en un script asociado
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const refreshToken = urlParams.get('refresh');
  
  if (token) {
    // Guardar tokens en localStorage
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    
    // Limpiar URL (opcional)
    window.history.replaceState({}, document.title, "/index.html");
    
    // Obtener información del usuario
    fetch('http://localhost:8081/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      console.log('Usuario autenticado:', data.user);
      // Mostrar información del usuario en la UI
    })
    .catch(err => console.error('Error al obtener usuario:', err));
  }
});
```

## Configuración del Gateway

El gateway debe hacer proxy de las siguientes rutas del auth service:

```nginx
# Ejemplo de configuración (si usas nginx)
location /api/auth/ {
    proxy_pass http://localhost:8081/api/auth/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

O si usas Express como gateway:

```javascript
// En tu gateway Express
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:8081',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying to auth service:', req.method, req.path);
  }
}));
```

## Endpoints Disponibles

### Autenticación con Google

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/auth/google` | Inicia el flujo OAuth 2.0 |
| GET | `/api/auth/google/callback` | Callback de Google (no llamar manualmente) |
| GET | `/api/auth/verify` | Verifica si un token es válido |
| GET | `/api/auth/me` | Obtiene información del usuario actual |
| POST | `/api/auth/refresh` | Renueva el access token |
| POST | `/api/auth/logout` | Cierra sesión (elimina token del cliente) |

### Ejemplo de Uso

#### Verificar Token
```javascript
fetch('http://localhost:8081/api/auth/verify', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

#### Obtener Usuario Actual
```javascript
fetch('http://localhost:8081/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(res => res.json())
.then(data => console.log(data.user));
```

#### Renovar Token
```javascript
fetch('http://localhost:8081/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refresh_token')
  })
})
.then(res => res.json())
.then(data => {
  localStorage.setItem('access_token', data.token);
});
```

## Configuración de Google Cloud Console

**IMPORTANTE**: Debes configurar las URIs autorizadas en la consola de Google Cloud:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a "APIs y servicios" > "Credenciales"
4. Edita tu Client ID de OAuth 2.0
5. Agrega las siguientes URIs:

### JavaScript origins autorizados:
```
http://localhost:8080
http://localhost:8081
```

### URIs de redirección autorizadas:
```
http://localhost:8081/api/auth/google/callback
```

## Botón de Login en login.html

Tu archivo `login.html` debe tener un botón que redirija a:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Movu</title>
</head>
<body>
    <div class="login-container">
        <h1>Iniciar Sesión</h1>
        
        <!-- Botón de Google OAuth -->
        <a href="/api/auth/google" class="google-login-btn">
            <img src="google-icon.svg" alt="Google">
            Iniciar sesión con Google
        </a>
        
        <!-- O con JavaScript -->
        <button id="googleLoginBtn">
            Iniciar sesión con Google
        </button>
    </div>
    
    <script>
        // Verificar si hay error en la URL
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
            switch(error) {
                case 'auth_failed':
                    alert('Error al autenticar con Google. Por favor intenta de nuevo.');
                    break;
                case 'token_generation_failed':
                    alert('Error al generar el token. Por favor intenta de nuevo.');
                    break;
            }
        }
        
        // Configurar botón de login
        document.getElementById('googleLoginBtn')?.addEventListener('click', () => {
            window.location.href = '/api/auth/google';
        });
    </script>
</body>
</html>
```

## Variables de Entorno Configuradas

El archivo `.env` ya está configurado con:

```env
# Auth Service corre en puerto 8081
PORT=8081

# Google OAuth
GOOGLE_CLIENT_ID=900085950768-erc4gn3m8hpahho0f73g1p1bvl8nk4f0.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:8081/api/auth/google/callback

# Frontend (Gateway)
FRONTEND_URL=http://localhost:8080

# CORS (permitir Gateway)
CORS_ORIGIN=http://localhost:8080
```

## Iniciar el Servicio

```bash
# Asegúrate de tener la base de datos corriendo
npm run migrate
npm run seed

# Iniciar el servicio
npm start
```

El servicio estará disponible en `http://localhost:8081`

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que `GOOGLE_CALLBACK_URL` en `.env` coincida con la URI configurada en Google Cloud Console
- Debe ser: `http://localhost:8081/api/auth/google/callback`

### Error: CORS
- Verifica que `CORS_ORIGIN` incluya `http://localhost:8080`
- El gateway debe hacer proxy correctamente de las peticiones

### El callback no redirige correctamente
- Verifica que `FRONTEND_URL` sea `http://localhost:8080` (sin /index.html)
- El auth service redirigirá a `http://localhost:8080/index.html?token=...`

### Token no se guarda
- Verifica que `index.html` tenga el script para capturar los parámetros de la URL
- Usa `localStorage.setItem('access_token', token)`
