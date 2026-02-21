import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import SkillTagInput from '../components/SkillTagInput';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateProject() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '', description: '', maxTeamSize: 5, tags: '',
    });
    const [requiredSkills, setRequiredSkills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (requiredSkills.length === 0) { setError('Add at least one required skill'); return; }
        setError('');
        setLoading(true);
        try {
            const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
            await projectsAPI.create({ ...form, requiredSkills, tags, maxTeamSize: Number(form.maxTeamSize) });
            navigate('/projects');
        } catch (err) {
            setError(err.response?.data?.message ?? 'Failed to create project');
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-8">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm mb-6 hover:text-brand-600 transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft size={16} /> Back
            </button>

            <h1 className="page-title mb-1">Create Project</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Describe your project and the skills you're looking for
            </p>

            <form onSubmit={handleSubmit} className="card space-y-5">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="label">Project Title *</label>
                    <input name="title" value={form.title} onChange={handleChange} required
                        className="input" placeholder="e.g. AI-Powered Task Manager" />
                </div>

                <div>
                    <label className="label">Description *</label>
                    <textarea name="description" value={form.description} onChange={handleChange} required
                        className="input resize-none h-32"
                        placeholder="Describe your project, its goals, and what you're building…" />
                </div>

                <div>
                    <label className="label">Required Skills *</label>
                    <SkillTagInput value={requiredSkills} onChange={setRequiredSkills}
                        placeholder="Add required skills…" max={15} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">Max Team Size</label>
                        <input name="maxTeamSize" type="number" min={1} max={50}
                            value={form.maxTeamSize} onChange={handleChange} className="input" />
                    </div>
                    <div>
                        <label className="label">Tags <span className="text-xs">(comma-separated)</span></label>
                        <input name="tags" value={form.tags} onChange={handleChange}
                            className="input" placeholder="startup, ai, web3" />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => navigate(-1)} className="btn-ghost flex-1">Cancel</button>
                    <button type="submit" className="btn-primary flex-1 gap-2" disabled={loading}>
                        {loading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    );
}
