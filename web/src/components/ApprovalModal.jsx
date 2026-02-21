import { X, Send, AlertTriangle } from 'lucide-react';

export default function ApprovalModal({ draft, onConfirm, onCancel }) {
    if (!draft) return null;

    return (
        /* Backdrop */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-lg shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                                Review Introduction Message
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                This message has <strong>not</strong> been sent yet
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface transition-colors"
                        style={{ color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Recipients */}
                <div className="rounded-xl p-3 mb-4 text-sm space-y-1" style={{ background: 'var(--bg-surface)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>To: </span>
                        {draft.recipientName}
                    </p>
                    <p style={{ color: 'var(--text-muted)' }}>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Subject: </span>
                        {draft.subject}
                    </p>
                </div>

                {/* Message body */}
                <div className="rounded-xl p-4 mb-5 max-h-52 overflow-y-auto scrollbar-hide border"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {draft.body}
                    </p>
                </div>

                {/* AI disclaimer */}
                <p className="text-xs mb-4 px-1" style={{ color: 'var(--text-muted)' }}>
                    ✨ Drafted by TeamForge AI. Review and edit before sending. You have full control.
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn-ghost flex-1">
                        Cancel
                    </button>
                    <button onClick={() => onConfirm(draft)} className="btn-primary flex-1 gap-2">
                        <Send size={15} />
                        Send Introduction
                    </button>
                </div>
            </div>
        </div>
    );
}
