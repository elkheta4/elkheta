'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import Store from '../services/store';
import { useAppContext } from './AppContext';

const UserDashboardContext = createContext({
    refreshTrigger: 0, 
    onOrderSaved: () => {}
});

export const UserDashboardProvider = ({ children }) => {
    const { user } = useAppContext();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const onOrderSaved = useCallback(() => {
        // User-specific cache key
        if (user?.agentName) {
            const cacheKey = `mySales_${user.agentName}`;
            Store.invalidate(cacheKey, 'local');
        }
        setRefreshTrigger(prev => prev + 1);
    }, [user?.agentName]);

    return (
        <UserDashboardContext.Provider value={{ refreshTrigger, onOrderSaved }}>
            {children}
        </UserDashboardContext.Provider>
    );
};

export const useUserDashboardContext = () => useContext(UserDashboardContext);
