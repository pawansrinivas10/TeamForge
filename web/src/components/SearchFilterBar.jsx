import { Search, X, ChevronDown } from 'lucide-react';

const AVAILABILITY_OPTIONS = [
    { value: '', label: 'All availability' },
    { value: 'available', label: '🟢 Available' },
    { value: 'part-time', label: '🟡 Part-time' },
    { value: 'busy', label: '🔴 Busy' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
];

export default function SearchFilterBar({
    searchValue,
    onSearchChange,
    skillFilter,
    onSkillChange,
    availabilityFilter,
    onAvailabilityChange,
    statusFilter,
    onStatusChange,
    placeholder = 'Search…',
    showAvailability = false,
    showStatus = false,
}) {
    return (
        <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
                <input
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder}
                    className="input pl-9 pr-9"
                />
                {searchValue && (
                    <button onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-red-500 transition-colors"
                        style={{ color: 'var(--text-muted)' }}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Skill filter */}
            <div className="relative min-w-[160px]">
                <input
                    value={skillFilter}
                    onChange={(e) => onSkillChange(e.target.value)}
                    placeholder="Filter by skill…"
                    className="input"
                />
            </div>

            {/* Availability dropdown */}
            {showAvailability && (
                <div className="relative">
                    <select
                        value={availabilityFilter}
                        onChange={(e) => onAvailabilityChange(e.target.value)}
                        className="input pr-8 appearance-none cursor-pointer">
                        {AVAILABILITY_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-muted)' }} />
                </div>
            )}

            {/* Status dropdown */}
            {showStatus && (
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="input pr-8 appearance-none cursor-pointer">
                        {STATUS_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-muted)' }} />
                </div>
            )}
        </div>
    );
}
