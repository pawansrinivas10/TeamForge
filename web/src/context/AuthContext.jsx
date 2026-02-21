import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('tf_user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('tf_token'));
    const [loading, setLoading] = useState(false);

    const saveSession = useCallback((userData, jwt) => {
        setUser(userData);
        setToken(jwt);
        localStorage.setItem('tf_user', JSON.stringify(userData));
        localStorage.setItem('tf_token', jwt);
    }, []);

    const clearSession = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('tf_user');
        localStorage.removeItem('tf_token');
    }, []);

    const signup = async (data) => {
        setLoading(true);
        try {
            const res = await authAPI.signup(data);
            saveSession(res.data.user, res.data.token);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Signup failed' };
        } finally { setLoading(false); }
    };

    const login = async (data) => {
        setLoading(true);
        try {
            const res = await authAPI.login(data);
            saveSession(res.data.user, res.data.token);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Login failed' };
        } finally { setLoading(false); }
    };

    const logout = () => clearSession();

    const updateUser = (updates) => {
        const updated = { ...user, ...updates };
        setUser(updated);
        localStorage.setItem('tf_user', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, signup, login, logout, updateUser, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}
