'use client';
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth';
import Store from '../services/store';
import Console from '../utils/console';
import { APP_SETTINGS } from '../utils/constants';

const AppContext = createContext({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  setUser: () => {}
});

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const storedUser = AuthService.getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await AuthService.login(username, password);
    if (result.success) {
      setUser(result.user);
      
      // SMART PRE-FETCH: Only fetch if cache doesn't exist
      // This saves API quota when same user logs back in
      if (result.user.role === 'Admin') {
        setTimeout(() => {
          // Check if we already have valid cache
          const hasOrdersCache = Store.hasValidCache('allSales', 'local');
          const hasUsersCache = Store.hasValidCache('users', 'local');
          
          if (!hasOrdersCache) {
            Console.context.fetch('Orders');
            Store.fetch('allSales', 'getSales', { agentName: 'Admin', showAll: true }, { storage: 'local', ttl: APP_SETTINGS.cache.ordersTTL })
              .catch(err => Console.context.warn('Orders fetch failed', err));
          } else {
            Console.context.cache('Orders');
          }
          
          if (!hasUsersCache) {
            Console.context.fetch('Users');
            Store.fetch('users', 'getUsers', null, { storage: 'local', ttl: APP_SETTINGS.cache.usersTTL })
              .catch(err => Console.context.warn('Users fetch failed', err));
          } else {
            Console.context.cache('Users');
          }
        }, 100);
      } else {
        setTimeout(() => {
          // User-specific cache key to prevent data mixing between users
          const cacheKey = `mySales_${result.user.agentName}`;
          const hasCache = Store.hasValidCache(cacheKey, 'local');
          
          if (!hasCache) {
            Console.context.fetch('Orders', result.user.agentName);
            Store.fetch(cacheKey, 'getSales', { agentName: result.user.agentName }, { storage: 'local', ttl: APP_SETTINGS.cache.ordersTTL })
              .catch(err => Console.context.warn('My Orders fetch failed', err));
          } else {
            Console.context.cache('Orders', result.user.agentName);
          }
          
          // Pre-fetch Wallet data so it's ready when user navigates to Wallets page
          if (result.user.wallets?.length > 0) {
            const walletCacheKey = `wallet_cache_${result.user.agentName}`;
            const cached = sessionStorage.getItem(walletCacheKey);
            
            if (!cached) {
              Console.context.fetch('Wallets', result.user.agentName);
              fetch('/api/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'fetch', agentName: result.user.agentName, wallets: result.user.wallets })
              })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    sessionStorage.setItem(walletCacheKey, JSON.stringify({
                      data: data.wallets,
                      timestamp: Date.now(),
                      updatedStr: nowStr
                    }));
                    Console.context.action('Wallets pre-fetched');
                  }
                })
                .catch(err => Console.context.warn('Wallets fetch failed', err));
            } else {
              Console.context.cache('Wallets', result.user.agentName);
            }
          }
        }, 100);
      }
    }
    return result;
  }, []);

  /**
   * LOGOUT - Clears session only, preserves localStorage cache
   * This optimizes API quota usage
   */
  const logout = useCallback(() => {
    // Clear session caches only (preserves localStorage for quota optimization)
    Store.clearSession();
    
    // Clear user session
    AuthService.logout();
    
    // Clear context state
    setUser(null);
    
    Console.context.action('Logout complete');
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

