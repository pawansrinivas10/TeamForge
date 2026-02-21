import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IProject extends Document {
    title: string;
    description: string;
    requiredSkills: string[];
    createdBy: Types.ObjectId;
    members: Types.ObjectId[];
    status: 'open' | 'in-progress' | 'completed' | 'archived';
    tags: string[];
    maxTeamSize: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const ProjectSchema = new Schema<IProject>(
    {
        title: {
            type: String,
            required: [true, 'Project title is required'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Project description is required'],
            trim: true,
            minlength: [10, 'Description must be at least 10 characters'],
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        requiredSkills: {
            type: [String],
            required: [true, 'At least one required skill must be specified'],
            validate: {
                validator: (skills: string[]) => skills.length >= 1 && skills.length <= 15,
                message: 'Required skills must be between 1 and 15 items',
            },
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: {
            type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
            default: [],
        },
        status: {
            type: String,
            enum: {
                values: ['open', 'in-progress', 'completed', 'archived'],
                message: 'Status must be open, in-progress, completed, or archived',
            },
            default: 'open',
        },
        tags: {
            type: [String],
            default: [],
        },
        maxTeamSize: {
            type: Number,
            default: 5,
            min: [1, 'Max team size must be at least 1'],
            max: [50, 'Max team size cannot exceed 50'],
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret: Record<string, unknown>) {
                delete ret['__v'];
                return ret;
            },
        },
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
ProjectSchema.index({ requiredSkills: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ title: 'text', description: 'text' });

// ─── Model ────────────────────────────────────────────────────────────────────
const Project: Model<IProject> = mongoose.model<IProject>('Project', ProjectSchema);
export default Project;
