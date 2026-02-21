import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, usersAPI } from '../services/api';
import { Bot, Plus, TrendingUp, Users, FolderKanban, Zap } from 'lucide-react';
import AIAssistantPanel from '../components/AIAssistantPanel';

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                <Icon size={22} className="text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ projects: 0, users: 0 });
    const [recentProjects, setRecent] = useState([]);
    const [aiOpen, setAiOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [pRes, uRes] = await Promise.all([
                    projectsAPI.getAll({ limit: 4 }),
                    usersAPI.getAll({ limit: 1 }),
                ]);
                setRecent(pRes.data.projects ?? []);
                setStats({ projects: pRes.data.total ?? 0, users: uRes.data.total ?? 0 });
            } catch { /* silent */ } finally { setLoading(false); }
        };
        load();
    }, []);

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Welcome banner */}
            <div className="rounded-2xl mb-8 p-7 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
                <div className="absolute -right-4 -bottom-12 w-64 h-64 rounded-full bg-white/5" />
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold text-white mb-1">
                        Welcome back, {user?.name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-white/70 text-sm mb-5">
                        Your skills: {user?.skills?.slice(0, 4).join(', ') || 'Add skills to your profile'}
                    </p>
                    <div className="flex gap-3 flex-wrap">
                        <Link to="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-700 font-semibold text-sm hover:bg-white/90 transition-all">
                            <Plus size={16} /> New Project
                        </Link>
                        <button onClick={() => setAiOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-all">
                            <Bot size={16} /> AI Team Finder
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard icon={FolderKanban} label="Total Projects" value={stats.projects} color="bg-brand-600" />
                <StatCard icon={Users} label="Community Users" value={stats.users} color="bg-purple-600" />
                <StatCard icon={TrendingUp} label="Your Skills" value={user?.skills?.length ?? 0} color="bg-emerald-600" />
            </div>

            {/* Recent projects */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Recent Projects</h2>
                <Link to="/projects" className="text-sm text-brand-600 font-medium hover:underline">View all →</Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="card h-36 animate-pulse" style={{ background: 'var(--bg-surface)' }} />
                    ))}
                </div>
            ) : recentProjects.length === 0 ? (
                <div className="card text-center py-12">
                    <Zap size={40} className="mx-auto mb-3 text-brand-400" />
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
                    <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Create your first project and find teammates</p>
                    <Link to="/projects/new" className="btn-primary inline-flex"><Plus size={15} /> New Project</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recentProjects.map((p) => (
                        <Link key={p._id} to="/projects" className="card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
                            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
                            <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                            <div className="flex flex-wrap gap-1">
                                {p.requiredSkills?.slice(0, 3).map((s) => <span key={s} className="skill-tag">{s}</span>)}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Floating AI button */}
            <button onClick={() => setAiOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center
                   bg-gradient-to-br from-brand-600 to-purple-600 text-white
                   hover:scale-110 active:scale-95 transition-all duration-200 z-30">
                <Bot size={24} />
            </button>

            <AIAssistantPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
    );
}
