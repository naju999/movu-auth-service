# Movu Auth Service

Servicio de autenticación y autorización para la plataforma MovieReviews. Implementa login con Google OAuth 2.0, gestión de usuarios y roles, y generación de tokens JWT.

## Autores

- Kevin Johann Jimenez Poveda ([KevP2051](https://github.com/KevP2051))
- Juan Pablo Martinez Gomez ([naju999](https://github.com/naju999))

## Características principales

- Autenticación con Google OAuth 2.0
- Generación y validación de tokens JWT
- Gestión de usuarios y roles
- Sistema de refresh tokens con ventana deslizante
- Integración con Kafka para eventos de autenticación
- Métricas de Prometheus
- Testing completo con Jest

## Estructura del proyecto

```
movu-auth-service/
├── package.json
├── .env
├── README.md
├── src/
│   ├── index.js               # Punto de entrada
│   ├── app.js                 # Configuración de Express
│   ├── config/
│   │   ├── database.js        # Configuración de Sequelize
│   │   ├── googleOAuth.js     # Configuración de Google OAuth
│   │   ├── kafka.js           # Configuración de Kafka
│   │   └── passport.js        # Estrategias de Passport
│   ├── controllers/
│   │   ├── authController.js  # Lógica de autenticación
│   │   └── roleController.js  # Gestión de roles
│   ├── middlewares/
│   │   ├── authMiddleware.js  # Validación JWT
│   │   └── roleMiddleware.js  # Autorización por roles
│   ├── migrations/            # Migraciones de Sequelize
│   ├── models/                # Modelos de datos
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Role.js
│   │   └── RefreshToken.js
│   ├── routes/
│   │   ├── auth.routes.js     # Rutas de autenticación
│   │   └── role.routes.js     # Rutas de roles
│   ├── seeders/               # Datos iniciales
│   └── services/
│       └── authService.js     # Lógica de negocio
└── tests/
    └── authService.test.js
```

## Instalación y ejecución

### Requisitos previos

- Node.js 16 o superior
- PostgreSQL 12 o superior
- npm o yarn
- Cuenta de Google Cloud con OAuth configurado

### Pasos de instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/KevP2051/movu-auth-service.git
   cd movu-auth-service
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura el archivo `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Edita el archivo `.env`:
   ```env
   # Servidor
   PORT=8081
   NODE_ENV=development
   
   # Base de datos
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=movu_db
   DB_USER=movu
   DB_PASSWORD=movudbpassword
   DB_SCHEMA=auth_service
   
   # Database URL (para Docker)
   DATABASE_URL=postgresql://movu:movudbpassword@localhost:5432/movu_db
   
   # JWT
   JWT_SECRET=tu-clave-secreta-segura
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d
   JWT_ACCESS_EXPIRATION=15m
   JWT_REFRESH_EXPIRATION=7d
   JWT_REFRESH_SLIDING_WINDOW=1d
   
   # Google OAuth 2.0
   GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:8081/api/auth/google/callback
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   
   # CORS
   CORS_ORIGIN=http://localhost:8080,http://localhost:3000
   
   # Kafka (opcional)
   KAFKA_BROKER=localhost:9092
   ```

4. Configura la base de datos:
   ```bash
   # Crear la base de datos (si no existe)
   createdb movu_db -U postgres
   
   # Ejecutar migraciones
   npm run migrate
   
   # (Opcional) Cargar datos iniciales
   npm run seed
   ```

5. Inicia el servicio:
   ```bash
   npm start
   ```
   
   Para desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

### Scripts disponibles

```bash
# Iniciar servicio en producción
npm start

# Iniciar servicio en desarrollo con nodemon
npm run dev

# Ejecutar pruebas
npm test

# Ejecutar pruebas con observador
npm run test:watch

# Verificar sintaxis con ESLint
npm run lint

# Corregir problemas de linting automáticamente
npm run lint:fix

# Validar sintaxis
npm run validate

# Build completo (lint + validate)
npm run build

# Migraciones de base de datos
npm run migrate            # Ejecutar todas las migraciones pendientes
npm run migrate:undo       # Revertir última migración
npm run migrate:undo:all   # Revertir todas las migraciones

# Seeders
npm run seed               # Cargar datos iniciales
```

## Migraciones

Este servicio utiliza Sequelize para gestionar el esquema de base de datos. Las migraciones se encuentran en `src/migrations/` y deben ejecutarse en orden.

### Aplicar migraciones

```bash
npm run migrate
```

Esto ejecutará todas las migraciones pendientes en orden:

1. `20251105000000-create-schema.js` - Crea el schema `auth_service`
2. `20251105000001-create-roles.js` - Crea la tabla de roles
3. `20251105000002-create-users.js` - Crea la tabla de usuarios
4. `20251105000003-create-refresh-tokens.js` - Crea la tabla de refresh tokens

### Revertir migraciones

```bash
# Revertir la última migración
npm run migrate:undo

# Revertir todas las migraciones
npm run migrate:undo:all
```

### Crear nueva migración

```bash
npx sequelize-cli migration:generate --name nombre-de-la-migracion
```

## Configuración de Google OAuth

Para habilitar la autenticación con Google:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ 
4. Crea credenciales OAuth 2.0:
   - Tipo: Aplicación web
   - Orígenes autorizados: `http://localhost:8081`
   - URIs de redireccionamiento: `http://localhost:8081/api/auth/google/callback`
5. Copia el Client ID y Client Secret al archivo `.env`

## Endpoints principales

### Autenticación

- `POST /api/auth/register` - Registro de usuario
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "Usuario Ejemplo"
  }
  ```

- `POST /api/auth/login` - Login con email y contraseña
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/google` - Iniciar autenticación con Google
- `GET /api/auth/google/callback` - Callback de Google OAuth
- `POST /api/auth/refresh-token` - Refrescar access token
  ```json
  {
    "refreshToken": "tu-refresh-token"
  }
  ```

- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual (requiere JWT)

### Gestión de roles

- `GET /api/roles` - Listar todos los roles
- `POST /api/roles` - Crear nuevo rol (admin)
- `PUT /api/roles/:id` - Actualizar rol (admin)
- `DELETE /api/roles/:id` - Eliminar rol (admin)

## Testing

Para ejecutar las pruebas:
```bash
npm test
```

Las pruebas cubren:
- Registro y login de usuarios
- Generación y validación de tokens JWT
- Refresh tokens
- Autenticación con Google
- Middleware de autorización

## Integración con Kafka

El servicio publica eventos a Kafka cuando ocurren acciones importantes:

- `user.registered` - Nuevo usuario registrado
- `user.logged_in` - Usuario inició sesión
- `user.logged_out` - Usuario cerró sesión
- `token.refreshed` - Access token refrescado

Configura `KAFKA_BROKER` en `.env` para habilitar esta funcionalidad.

## Métricas y monitoreo

El servicio expone métricas de Prometheus en `/metrics`:
- Número de autenticaciones exitosas/fallidas
- Tokens generados
- Tiempo de respuesta de endpoints
- Errores de base de datos

## Dependencias principales

### Producción

- **express** - Framework web para Node.js
- **sequelize** - ORM para PostgreSQL
- **pg** - Driver de PostgreSQL
- **bcrypt** - Hashing de contraseñas
- **jsonwebtoken** - Generación y validación de JWT
- **passport** - Middleware de autenticación
- **passport-google-oauth20** - Estrategia de Google OAuth
- **google-auth-library** - Cliente de Google Auth
- **kafkajs** - Cliente de Kafka
- **dotenv** - Gestión de variables de entorno
- **cors** - Configuración de CORS
- **prom-client** - Métricas de Prometheus

### Desarrollo

- **jest** - Framework de testing
- **supertest** - Testing de APIs HTTP
- **eslint** - Linter de JavaScript
- **nodemon** - Recarga automática en desarrollo
- **sequelize-cli** - CLI de Sequelize para migraciones

## Seguridad

Implementaciones de seguridad:
- Hashing de contraseñas con bcrypt (12 rounds)
- Tokens JWT con expiración
- Refresh tokens con ventana deslizante
- Validación de entrada en todos los endpoints
- CORS configurado
- Headers de seguridad
- Rate limiting (configurado en el gateway)

## Troubleshooting

### Error de conexión a la base de datos

Verifica que:
1. PostgreSQL esté ejecutándose
2. Las credenciales en `.env` sean correctas
3. La base de datos `movu_db` exista
4. El usuario tenga permisos suficientes

### Error en Google OAuth

Asegúrate de que:
1. Las credenciales de Google Cloud estén correctas
2. La URL de callback coincida con la configurada en Google Cloud
3. La API de Google+ esté habilitada

### Migraciones fallan

Si las migraciones fallan:
```bash
# Revertir todas
npm run migrate:undo:all

# Eliminar y recrear la base de datos
dropdb movu_db -U postgres
createdb movu_db -U postgres

# Ejecutar migraciones nuevamente
npm run migrate
```

## Licencia

ISC
