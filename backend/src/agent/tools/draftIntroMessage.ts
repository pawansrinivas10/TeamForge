import User from '../../models/User';
import Project from '../../models/Project';

// ─── Tool: draft_intro_message ────────────────────────────────────────────────
// Generates a structured introduction message from one user to another
// in the context of a project collaboration invitation

export interface DraftIntroInput {
    fromUserId: string;
    toUserId: string;
    projectId?: string;
    customNote?: string;
}

export interface DraftIntroOutput {
    subject: string;
    body: string;
    recipientId: string;
    recipientName: string;
    senderName: string;
    projectTitle?: string;
    generatedAt: string;
}

export const draftIntroMessage = async (
    input: DraftIntroInput
): Promise<DraftIntroOutput> => {
    const { fromUserId, toUserId, projectId, customNote } = input;

    if (!fromUserId || !toUserId) {
        throw new Error('draft_intro_message requires fromUserId and toUserId');
    }

    // Fetch sender and recipient in parallel
    const [sender, recipient] = await Promise.all([
        User.findById(fromUserId).select('name skills bio').lean(),
        User.findById(toUserId).select('name skills bio').lean(),
    ]);

    if (!sender) throw new Error(`Sender user (${fromUserId}) not found`);
    if (!recipient) throw new Error(`Recipient user (${toUserId}) not found`);

    let projectTitle: string | undefined;
    let projectDescription: string | undefined;

    if (projectId) {
        const project = await Project.findById(projectId).select('title description').lean();
        if (project) {
            projectTitle = project.title;
            projectDescription = project.description;
        }
    }

    // ── Build subject line ────────────────────────────────────────────────────
    const subject = projectTitle
        ? `Collaboration Invitation: "${projectTitle}" — TeamForge`
        : `Team Collaboration Invitation from ${sender.name} — TeamForge`;

    // ── Build message body ────────────────────────────────────────────────────
    const senderSkillsStr =
        sender.skills.length > 0 ? sender.skills.slice(0, 5).join(', ') : 'various skills';

    const projectCtx = projectTitle
        ? `I'm building a project called **"${projectTitle}"**${projectDescription ? ` — ${projectDescription.slice(0, 100)}...` : ''} `
        : '';

    const customCtx = customNote ? `\n\n${customNote}` : '';

    const body = `Hi ${recipient.name},

My name is ${sender.name} and I found your profile on TeamForge. ${projectCtx}I noticed your skills align well with what we're looking for, and I'd love to explore the possibility of collaborating.

A bit about me: I bring expertise in ${senderSkillsStr}. ${sender.bio ? `\n\n${sender.bio}` : ''}${customCtx}

I believe your background could be a great addition to our team. Would you be open to a quick chat to discuss further?

Looking forward to hearing from you!

Best regards,
${sender.name}

—
Sent via TeamForge AI Assistant`;

    return {
        subject,
        body: body.trim(),
        recipientId: toUserId,
        recipientName: recipient.name,
        senderName: sender.name,
        projectTitle,
        generatedAt: new Date().toISOString(),
    };
};
