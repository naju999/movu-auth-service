/**
 * Cliente JavaScript para integrar con el Auth Service
 * Incluye este script en tu index.html y login.html del Gateway
 */

class AuthClient {
  constructor(authServiceUrl = 'http://localhost:8081') {
    this.authServiceUrl = authServiceUrl;
    this.tokenKey = 'access_token';
    this.refreshKey = 'refresh_token';
  }

  /**
   * Captura los tokens de la URL después del callback de Google
   * Llamar esto en el DOMContentLoaded de index.html
   */
  captureTokensFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const refreshToken = urlParams.get('refresh');

    if (token) {
      this.saveToken(token);
      if (refreshToken) {
        this.saveRefreshToken(refreshToken);
      }

      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);

      console.log('✓ Tokens capturados y guardados');
      return true;
    }
    return false;
  }

  /**
   * Guarda el access token en localStorage
   */
  saveToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Guarda el refresh token en localStorage
   */
  saveRefreshToken(refreshToken) {
    localStorage.setItem(this.refreshKey, refreshToken);
  }

  /**
   * Obtiene el access token del localStorage
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Obtiene el refresh token del localStorage
   */
  getRefreshToken() {
    return localStorage.getItem(this.refreshKey);
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Redirige al login de Google
   */
  loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  /**
   * Verifica si el token es válido
   */
  async verifyToken() {
    try {
      const response = await fetch(`${this.authServiceUrl}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Token inválido');
      }

      const data = await response.json();
      return data.success ? data.user : null;
    } catch (error) {
      console.error('Error verificando token:', error);
      return null;
    }
  }

  /**
   * Obtiene la información del usuario actual
   */
  async getCurrentUser() {
    try {
      const response = await fetch(`${this.authServiceUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener usuario');
      }

      const data = await response.json();
      return data.success ? data.user : null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  /**
   * Renueva el access token usando el refresh token
   */
  async refreshToken() {
    try {
      const response = await fetch(`${this.authServiceUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.getRefreshToken()
        })
      });

      if (!response.ok) {
        throw new Error('Error renovando token');
      }

      const data = await response.json();
      if (data.success && data.token) {
        this.saveToken(data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error renovando token:', error);
      return false;
    }
  }

  /**
   * Cierra sesión (elimina tokens)
   */
  async logout() {
    try {
      // Llamar al endpoint de logout (opcional)
      await fetch(`${this.authServiceUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Eliminar tokens del localStorage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshKey);
      
      // Redirigir al login
      window.location.href = '/login.html';
    }
  }

  /**
   * Helper para hacer peticiones autenticadas
   */
  async authenticatedFetch(url, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    try {
      let response = await fetch(url, {
        ...options,
        headers
      });

      // Si el token expiró, intentar renovarlo
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Reintentar la petición con el nuevo token
          headers.Authorization = `Bearer ${this.getToken()}`;
          response = await fetch(url, {
            ...options,
            headers
          });
        } else {
          // No se pudo renovar, redirigir al login
          this.logout();
          throw new Error('Sesión expirada');
        }
      }

      return response;
    } catch (error) {
      console.error('Error en petición autenticada:', error);
      throw error;
    }
  }
}

// Crear instancia global
const authClient = new AuthClient();

// ============================================
// Ejemplo de uso en index.html
// ============================================

/**
 * Agregar esto en el index.html:
 * 
 * <script src="auth-client.js"></script>
 * <script>
 *   document.addEventListener('DOMContentLoaded', async () => {
 *     // 1. Capturar tokens de la URL (después del callback de Google)
 *     authClient.captureTokensFromURL();
 *     
 *     // 2. Verificar si el usuario está autenticado
 *     if (!authClient.isAuthenticated()) {
 *       window.location.href = '/login.html';
 *       return;
 *     }
 *     
 *     // 3. Obtener información del usuario
 *     try {
 *       const user = await authClient.getCurrentUser();
 *       if (user) {
 *         console.log('Usuario autenticado:', user);
 *         
 *         // Mostrar información en la UI
 *         document.getElementById('username').textContent = user.username;
 *         document.getElementById('email').textContent = user.email;
 *         
 *         if (user.picture) {
 *           document.getElementById('avatar').src = user.picture;
 *         }
 *       } else {
 *         // Token inválido, redirigir al login
 *         window.location.href = '/login.html';
 *       }
 *     } catch (error) {
 *       console.error('Error:', error);
 *       window.location.href = '/login.html';
 *     }
 *     
 *     // 4. Configurar botón de logout
 *     document.getElementById('logoutBtn')?.addEventListener('click', () => {
 *       authClient.logout();
 *     });
 *   });
 * </script>
 */

// ============================================
// Ejemplo de uso en login.html
// ============================================

/**
 * Agregar esto en el login.html:
 * 
 * <script src="auth-client.js"></script>
 * <script>
 *   document.addEventListener('DOMContentLoaded', () => {
 *     // Si ya está autenticado, redirigir al index
 *     if (authClient.isAuthenticated()) {
 *       window.location.href = '/index.html';
 *       return;
 *     }
 *     
 *     // Verificar si hay error en la URL
 *     const urlParams = new URLSearchParams(window.location.search);
 *     const error = urlParams.get('error');
 *     
 *     if (error) {
 *       const messages = {
 *         'auth_failed': 'Error al autenticar con Google. Por favor intenta de nuevo.',
 *         'token_generation_failed': 'Error al generar el token. Por favor intenta de nuevo.'
 *       };
 *       
 *       const message = messages[error] || 'Error desconocido';
 *       alert(message);
 *       
 *       // Limpiar la URL
 *       window.history.replaceState({}, document.title, '/login.html');
 *     }
 *     
 *     // Configurar botón de login con Google
 *     document.getElementById('googleLoginBtn')?.addEventListener('click', () => {
 *       authClient.loginWithGoogle();
 *     });
 *   });
 * </script>
 */

// ============================================
// Ejemplo de peticiones autenticadas
// ============================================

/**
 * Usar authenticatedFetch para hacer peticiones que requieren autenticación:
 * 
 * // Ejemplo: Obtener datos de un servicio protegido
 * try {
 *   const response = await authClient.authenticatedFetch('http://localhost:8082/api/trips');
 *   const data = await response.json();
 *   console.log('Viajes:', data);
 * } catch (error) {
 *   console.error('Error obteniendo viajes:', error);
 * }
 */

// Exportar para uso en módulos (opcional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthClient;
}
