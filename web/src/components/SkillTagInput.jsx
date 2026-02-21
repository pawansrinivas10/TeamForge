import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const SUGGESTIONS = [
    'React', 'TypeScript', 'Node.js', 'Python', 'MongoDB', 'PostgreSQL',
    'Docker', 'AWS', 'Figma', 'Flutter', 'Swift', 'Kotlin', 'Vue', 'Angular',
    'GraphQL', 'Redis', 'Django', 'FastAPI', 'Go', 'Rust', 'Machine Learning', 'DevOps',
];

export default function SkillTagInput({ value = [], onChange, placeholder = 'Add skill…', max = 20 }) {
    const [inputVal, setInputVal] = useState('');
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);

    const suggestions = SUGGESTIONS.filter(
        (s) => s.toLowerCase().includes(inputVal.toLowerCase()) && !value.includes(s) && inputVal.length > 0
    ).slice(0, 6);

    const addSkill = (skill) => {
        const trimmed = skill.trim();
        if (!trimmed || value.includes(trimmed) || value.length >= max) return;
        onChange([...value, trimmed]);
        setInputVal('');
    };

    const removeSkill = (skill) => onChange(value.filter((s) => s !== skill));

    const handleKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
            e.preventDefault();
            addSkill(inputVal);
        }
        if (e.key === 'Backspace' && !inputVal && value.length > 0) {
            removeSkill(value[value.length - 1]);
        }
    };

    return (
        <div className="relative">
            <div
                className="input flex flex-wrap gap-1.5 min-h-[44px] cursor-text h-auto py-2"
                onClick={() => inputRef.current?.focus()}>
                {value.map((skill) => (
                    <span key={skill} className="skill-tag gap-1">
                        {skill}
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeSkill(skill); }}
                            className="hover:text-red-500 transition-colors ml-0.5">
                            <X size={11} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 150)}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                    style={{ color: 'var(--text-primary)' }}
                />
            </div>

            {/* Autocomplete suggestions */}
            {focused && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 z-20 card p-1.5 shadow-xl animate-fade-in">
                    {suggestions.map((s) => (
                        <button key={s} type="button"
                            onMouseDown={() => addSkill(s)}
                            className="w-full text-left text-sm px-3 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                            style={{ color: 'var(--text-primary)' }}>
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {max && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {value.length}/{max} skills • Press Enter or comma to add
                </p>
            )}
        </div>
    );
}
