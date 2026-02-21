import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import SearchFilterBar from '../components/SearchFilterBar';
import AIAssistantPanel from '../components/AIAssistantPanel';
import { Plus, Bot, FolderX, Loader2 } from 'lucide-react';

const DEBOUNCE_MS = 400;

export default function ProjectFeed() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [aiOpen, setAiOpen] = useState(false);

    // Filter state
    const [search, setSearch] = useState('');
    const [skillFilter, setSkillFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async (pg = 1, reset = false) => {
        setLoading(true);
        try {
            const params = { page: pg, limit: 12 };
            if (search) params.search = search;
            if (skillFilter) params.skills = skillFilter;
            if (statusFilter) params.status = statusFilter;

            const res = await projectsAPI.getAll(params);
            const next = res.data.projects ?? [];
            setProjects((prev) => (reset || pg === 1) ? next : [...prev, ...next]);
            setTotal(res.data.total ?? 0);
            setPage(pg);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [search, skillFilter, statusFilter]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => load(1, true), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [search, skillFilter, statusFilter]);

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="page-title">Project Feed</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {total} project{total !== 1 ? 's' : ''} found
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setAiOpen(true)} className="btn-ghost gap-2">
                        <Bot size={16} /> AI Match
                    </button>
                    <button onClick={() => navigate('/projects/new')} className="btn-primary gap-2">
                        <Plus size={16} /> New Project
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
                <SearchFilterBar
                    searchValue={search} onSearchChange={setSearch}
                    skillFilter={skillFilter} onSkillChange={setSkillFilter}
                    statusFilter={statusFilter} onStatusChange={setStatusFilter}
                    placeholder="Search projects…"
                    showStatus={true}
                />
            </div>

            {/* Grid */}
            {loading && projects.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card h-44 animate-pulse" style={{ background: 'var(--bg-surface)' }} />
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <div className="card py-20 text-center">
                    <FolderX size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No projects match your filters</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Try clearing some filters or create the first project</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((p) => (
                            <ProjectCard key={p._id} project={p} onClick={() => { }} />
                        ))}
                    </div>

                    {/* Load more */}
                    {projects.length < total && (
                        <div className="mt-8 text-center">
                            <button onClick={() => load(page + 1)} disabled={loading} className="btn-ghost gap-2">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                                Load more
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Floating AI */}
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
