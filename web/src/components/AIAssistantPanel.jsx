import { useState, useRef, useEffect } from 'react';
import { X, Bot, Send, Loader2, User, ChevronRight } from 'lucide-react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ApprovalModal from './ApprovalModal';

const TypingIndicator = () => (
    <div className="flex items-center gap-1 px-3 py-2">
        {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
    </div>
);

export default function AIAssistantPanel({ open, onClose, projectId }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: `Hi ${user?.name?.split(' ')[0] ?? 'there'}! 👋 I'm your TeamForge AI assistant.\n\nTell me what skills you need — I'll find the best-matched users and help you draft an introduction.\n\nExample: *"Find me React and TypeScript developers"*`,
            id: 'welcome',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [draft, setDraft] = useState(null);
    const [pendingMatches, setPendingMatches] = useState([]);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const addMessage = (role, text, meta = {}) =>
        setMessages((m) => [...m, { role, text, id: Date.now(), ...meta }]);

    const sendMessage = async (messageText, extraBody = {}) => {
        const text = messageText ?? input.trim();
        if (!text || loading) return;
        setInput('');
        addMessage('user', text);
        setLoading(true);

        try {
            const res = await aiAPI.match({ message: text, projectId, ...extraBody });
            const data = res.data;

            // Store matches for approval flow
            if (data.matches?.length) setPendingMatches(data.matches);

            // Build assistant response text
            let reply = `**Reasoning:** ${data.reasoning}\n\n`;

            if (data.matches?.length) {
                reply += `**Top matches** (${data.algorithm ?? 'cosine-binary'}):\n`;
                data.matches.slice(0, 3).forEach((m, i) => {
                    const score = m.cosineSimilarity != null
                        ? ` • score ${(m.cosineSimilarity * 100).toFixed(0)}%`
                        : ` • ${m.matchScore} skill${m.matchScore !== 1 ? 's' : ''} matched`;
                    reply += `${i + 1}. **${m.name}**${score} — ${m.availability}\n   Skills: ${m.matchedSkills.join(', ')}\n`;
                });
            }

            if (data.awaitingApproval && data.approvalPrompt) {
                reply += `\n---\n${data.approvalPrompt}`;
            }

            if (data.draftMessage) {
                setDraft(data.draftMessage);
                reply += `\n\n✅ Draft ready! Showing you a preview now…`;
            }

            if (data.error && !data.matches?.length) {
                reply = `⚠️ ${data.error}`;
            }

            addMessage('assistant', reply, { matches: data.matches, awaitingApproval: data.awaitingApproval });
        } catch (err) {
            addMessage('assistant', `❌ Something went wrong: ${err.response?.data?.message ?? err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = (approvedDraft) => {
        setDraft(null);
        addMessage('assistant', `✅ Introduction sent to **${approvedDraft.recipientName}**!\n\nSubject: *${approvedDraft.subject}*`);
    };

    const handleApproveUser = (match) => {
        sendMessage(`Draft intro to ${match.name}`, { approvedMessageTo: match.userId });
    };

    if (!open) return null;

    return (
        <>
            {/* Side drawer */}
            <div className="fixed inset-y-0 right-0 z-40 flex">
                {/* Overlay */}
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

                {/* Panel */}
                <div className="relative ml-auto w-full max-w-md flex flex-col shadow-2xl animate-slide-in"
                    style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                                <Bot size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI Team Assistant</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bounded · max 2 tool calls</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-surface"
                            style={{ color: 'var(--text-muted)' }}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${msg.role === 'user' ? 'bg-brand-600' : 'bg-gradient-to-br from-brand-500 to-purple-600'
                                    }`}>
                                    {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-tr-sm'
                                        : 'rounded-tl-sm'
                                    }`}
                                    style={msg.role !== 'user' ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' } : {}}>
                                    <p className="whitespace-pre-wrap"
                                        dangerouslySetInnerHTML={{
                                            __html: msg.text
                                                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\*(.+?)\*/g, '<em>$1</em>'),
                                        }}
                                    />

                                    {/* Quick-approve buttons */}
                                    {msg.awaitingApproval && msg.matches?.length > 0 && (
                                        <div className="mt-3 space-y-1.5">
                                            {msg.matches.slice(0, 3).map((match) => (
                                                <button key={match.userId}
                                                    onClick={() => handleApproveUser(match)}
                                                    disabled={loading}
                                                    className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                                    <span>✉️ Draft intro to <strong>{match.name}</strong></span>
                                                    <ChevronRight size={12} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                                    <Bot size={13} className="text-white" />
                                </div>
                                <div className="rounded-2xl rounded-tl-sm px-2" style={{ background: 'var(--bg-surface)' }}>
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Find me React developers…"
                                disabled={loading}
                                className="input flex-1 text-sm"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className="btn-primary px-3 py-2.5 rounded-xl disabled:opacity-50">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                            AI will explain reasoning · ask approval before sending
                        </p>
                    </div>
                </div>
            </div>

            {/* Approval modal */}
            {draft && <ApprovalModal draft={draft} onConfirm={handleApprove} onCancel={() => setDraft(null)} />}
        </>
    );
}
