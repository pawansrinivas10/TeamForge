import { Users, Clock, CheckCircle } from 'lucide-react';

const STATUS_STYLES = {
    open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const STATUS_ICON = {
    open: <CheckCircle size={11} />,
    'in-progress': <Clock size={11} />,
    completed: <CheckCircle size={11} />,
    archived: <CheckCircle size={11} />,
};

export default function ProjectCard({ project, onClick }) {
    const { title, description, requiredSkills = [], members = [], status = 'open', createdBy } = project;

    return (
        <article
            onClick={() => onClick?.(project)}
            className="card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">

            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-base leading-snug group-hover:text-brand-600 transition-colors"
                    style={{ color: 'var(--text-primary)' }}>
                    {title}
                </h3>
                <span className={`badge whitespace-nowrap flex items-center gap-1 ${STATUS_STYLES[status] ?? STATUS_STYLES.open}`}>
                    {STATUS_ICON[status]}
                    {status}
                </span>
            </div>

            {/* Description */}
            <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                {description}
            </p>

            {/* Required skills */}
            {requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {requiredSkills.slice(0, 5).map((skill) => (
                        <span key={skill} className="skill-tag">{skill}</span>
                    ))}
                    {requiredSkills.length > 5 && (
                        <span className="skill-tag opacity-60">+{requiredSkills.length - 5}</span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {createdBy?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span>{createdBy?.name ?? 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Users size={12} />
                    <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </article>
    );
}
