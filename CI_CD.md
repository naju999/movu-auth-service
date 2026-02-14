# CI/CD Pipeline - movu-auth-service

## 📋 Resumen

Este proyecto incluye un pipeline de CI/CD automatizado con GitHub Actions que se ejecuta en cada push o pull request a las ramas `main` y `develop`.

## 🔄 Pipeline Stages

### 1. **Build & Test**

El workflow `.github/workflows/ci.yml` ejecuta las siguientes etapas:

#### Checkout
- Descarga el código del repositorio

#### Setup Node.js
- Configura múltiples versiones de Node.js (18.x, 20.x)
- Utiliza cache de npm para acelerar las instalaciones

#### Install Dependencies
- Ejecuta `npm ci` para instalar dependencias de forma limpia

#### Linting (opcional)
- Verifica si existe un script de lint en `package.json`
- Se salta si no está configurado

#### Run Tests
- Ejecuta `npm test` que corre Jest con cobertura de código
- **8 tests unitarios** que cubren:
  - ✅ Hash y comparación de contraseñas
  - ✅ Generación de access tokens
  - ✅ Generación de refresh tokens
  - ✅ Asignación de roles a usuarios
  - ✅ Validación de roles inexistentes
  - ✅ Creación de nuevos roles
  - ✅ Validación de roles duplicados

#### Upload Coverage
- Sube reportes de cobertura a Codecov (solo para Node 20.x)

#### Build Check
- Confirma que el build fue exitoso

## 🧪 Tests Unitarios

### Ubicación
```
tests/
├── authService.test.js  (4 tests)
└── roleService.test.js  (4 tests)
```

### Ejecutar Tests Localmente

```bash
# Ejecutar todos los tests con cobertura
npm test

# Ejecutar tests en modo watch
npm run test:watch
```

### Cobertura Actual
```
File            | % Stmts | % Branch | % Funcs | % Lines |
----------------|---------|----------|---------|---------|
authService.js  |   11.81 |        0 |   18.18 |   12.26 |
roleService.js  |      50 |    41.66 |   33.33 |   51.85 |
```

## 🚀 Triggers del Pipeline

El pipeline se ejecuta automáticamente en:

- **Push** a `main` o `develop`
- **Pull Requests** hacia `main` o `develop`

## 📊 Matriz de Versiones

El pipeline se ejecuta en múltiples versiones de Node.js para asegurar compatibilidad:

- Node.js 18.x
- Node.js 20.x

## 🔧 Configuración de Jest

```json
{
  "testEnvironment": "node",
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/migrations/",
    "/seeders/"
  ],
  "testMatch": [
    "**/tests/**/*.test.js"
  ]
}
```

## 📦 Dependencias de Testing

- **jest**: Framework de testing
- **supertest**: Testing de endpoints HTTP (instalado para futuros tests de integración)
- **@types/jest**: Tipos para mejor autocompletado

## 🔐 Secretos Requeridos

Para integración completa con Codecov (opcional):
- `CODECOV_TOKEN`: Token de Codecov para subir reportes

## 🎯 Próximos Pasos (Opcional)

1. Agregar tests de integración con Supertest
2. Agregar linting con ESLint
3. Configurar SonarQube para análisis de calidad de código
4. Agregar stage de deploy (CD)
5. Configurar notificaciones de Slack/Discord

## ✅ Estado del Pipeline

Para ver el estado actual del pipeline, visita la pestaña **Actions** en GitHub.
