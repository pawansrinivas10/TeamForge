import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Zap, LayoutDashboard, FolderKanban, User, LogOut } from 'lucide-react';

const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', Icon: FolderKanban },
    { to: '/profile', label: 'Profile', Icon: User },
];

export default function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const { dark, toggle } = useTheme();
    const location = useLocation();

    return (
        <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 border-b backdrop-blur-md"
            style={{ background: 'rgba(var(--bg-card-rgb, 255 255 255) / 0.85)', borderColor: 'var(--border)' }}>

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 mr-10">
                <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
                    <Zap size={16} className="text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    TeamForge
                </span>
            </Link>

            {/* Nav links */}
            {isAuthenticated && (
                <div className="flex items-center gap-1 flex-1">
                    {NAV_LINKS.map(({ to, label, Icon }) => {
                        const active = location.pathname === to;
                        return (
                            <Link key={to} to={to}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${active
                                        ? 'bg-brand-600 text-white'
                                        : 'hover:bg-surface text-muted hover:text-primary'
                                    }`}
                                style={!active ? { color: 'var(--text-muted)' } : {}}>
                                <Icon size={15} />
                                {label}
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Right controls */}
            <div className="ml-auto flex items-center gap-3">
                <button onClick={toggle}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                    aria-label="Toggle theme">
                    {dark ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {isAuthenticated && (
                    <>
                        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold select-none">
                            {user?.name?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <button onClick={logout}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                            style={{ color: 'var(--text-muted)' }} aria-label="Logout">
                            <LogOut size={16} />
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
