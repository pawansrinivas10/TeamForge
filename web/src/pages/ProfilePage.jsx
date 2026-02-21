import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SkillTagInput from '../components/SkillTagInput';
import { Save, Loader2, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({
        name: user?.name ?? '',
        bio: user?.bio ?? '',
        availability: user?.availability ?? 'available',
    });
    const [skills, setSkills] = useState(user?.skills ?? []);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await usersAPI.updateMe({ ...form, skills });
            updateUser(res.data.user);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Profile update failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-8">
            <h1 className="page-title mb-1">Edit Profile</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Keep your profile updated so teams can find you
            </p>

            {/* Avatar section */}
            <div className="card mb-5 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                    <span className={`badge mt-1 text-xs ${user?.availability === 'available'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : user?.availability === 'busy'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                        {user?.availability ?? 'available'}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-5">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}
                {saved && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                        <CheckCircle size={16} /> Profile updated successfully!
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">Full Name</label>
                        <input name="name" value={form.name} onChange={handleChange}
                            className="input" required placeholder="Your name" />
                    </div>
                    <div>
                        <label className="label">Availability</label>
                        <select name="availability" value={form.availability} onChange={handleChange} className="input">
                            <option value="available">🟢 Available</option>
                            <option value="part-time">🟡 Part-time</option>
                            <option value="busy">🔴 Busy</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="label">Skills</label>
                    <SkillTagInput value={skills} onChange={setSkills} placeholder="Add skill…" max={20} />
                </div>

                <div>
                    <label className="label">Bio</label>
                    <textarea name="bio" value={form.bio} onChange={handleChange}
                        className="input resize-none h-28"
                        placeholder="Tell potential teammates about yourself, your experience, and what you're looking to build…" />
                </div>

                <button type="submit" className="btn-primary w-full gap-2" disabled={loading}>
                    {loading
                        ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                        : <><Save size={15} /> Save Profile</>}
                </button>
            </form>
        </div>
    );
}
