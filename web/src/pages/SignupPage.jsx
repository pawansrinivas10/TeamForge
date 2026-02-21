import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SkillTagInput from '../components/SkillTagInput';
import { Eye, EyeOff, Zap } from 'lucide-react';

export default function SignupPage() {
    const { signup, loading } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', bio: '', availability: 'available' });
    const [skills, setSkills] = useState([]);
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await signup({ ...form, skills });
        if (res.success) navigate('/dashboard');
        else setError(res.message);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
                        <Zap size={24} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Create account</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Join TeamForge and start building teams
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="card space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Full Name</label>
                            <input name="name" value={form.name} onChange={handleChange}
                                className="input" placeholder="Alice Chen" required />
                        </div>
                        <div>
                            <label className="label">Availability</label>
                            <select name="availability" value={form.availability} onChange={handleChange} className="input">
                                <option value="available">Available</option>
                                <option value="part-time">Part-time</option>
                                <option value="busy">Busy</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Email</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange}
                            className="input" placeholder="alice@example.com" required />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <div className="relative">
                            <input name="password" type={showPass ? 'text' : 'password'} value={form.password}
                                onChange={handleChange} className="input pr-10" placeholder="Min 8 chars, uppercase + digit" required />
                            <button type="button" onClick={() => setShowPass((s) => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="label">Skills</label>
                        <SkillTagInput value={skills} onChange={setSkills} placeholder="Type skill + Enter" />
                    </div>

                    <div>
                        <label className="label">Bio <span className="text-xs">(optional)</span></label>
                        <textarea name="bio" value={form.bio} onChange={handleChange}
                            className="input resize-none h-20" placeholder="Tell teams about yourself..." />
                    </div>

                    <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>

                    <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Already have an account?{' '}
                        <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
