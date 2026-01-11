import { callGasApi } from './api';
import Console from '../utils/console';

/**
 * AUTHENTICATION SERVICE
 * Pure client-side authentication for SPA
 */

export const AuthService = {
  getUser: () => {
    if (typeof window === 'undefined') return null;
    const userJson = sessionStorage.getItem('currentUser');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch (e) {
      return null;
    }
  },

  checkSession: (requiredRole = null) => {
    const user = AuthService.getUser();
    if (!user) return null;

    const role = user.role ? user.role.toLowerCase() : '';

    if (requiredRole && requiredRole.toLowerCase() !== role) {
      return null;
    }

    return user;
  },

  login: async (username, password) => {
    return callGasApi('login', { username, password })
      .then(result => {
        if (result.success) {
          const sessionUser = {
            username: result.user.username,
            agentName: result.user.agentName,
            role: result.user.role,
            wallets: result.user.wallets || []
          };
          sessionStorage.setItem('currentUser', JSON.stringify(sessionUser));
          return { success: true, user: sessionUser };
        } else {
          return { success: false, error: result.error || 'Login failed' };
        }
      });
  },

  /**
   * Logout - Clear session only (not cached data)
   * Cached data can be reused if same user logs back in
   */
  logout: () => {
    if (typeof window === 'undefined') return;
    
    // Only clear session storage (user session)
    // Keep localStorage cache for quota optimization
    try {
      sessionStorage.clear();
    } catch (e) {}
    
    Console.auth.action('Session cleared');
  }
};
