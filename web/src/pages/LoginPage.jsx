import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Zap } from 'lucide-react';

export default function LoginPage() {
    const { login, loading } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await login(form);
        if (res.success) navigate('/dashboard');
        else setError(res.message);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
                        <Zap size={24} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sign in to TeamForge</p>
                </div>

                <form onSubmit={handleSubmit} className="card space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="label">Email</label>
                        <input type="email" value={form.email} required
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            className="input" placeholder="alice@example.com" />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <div className="relative">
                            <input type={showPass ? 'text' : 'password'} value={form.password} required
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                className="input pr-10" placeholder="Enter password" />
                            <button type="button" onClick={() => setShowPass((s) => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>

                    <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        New to TeamForge?{' '}
                        <Link to="/signup" className="text-brand-600 font-semibold hover:underline">Create account</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
