import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    skills: string[];
    availability: 'available' | 'busy' | 'part-time';
    bio: string;
    pushToken?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [60, 'Name cannot exceed 60 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Never return password by default
        },
        skills: {
            type: [String],
            default: [],
            validate: {
                validator: (skills: string[]) => skills.length <= 20,
                message: 'Cannot have more than 20 skills',
            },
        },
        availability: {
            type: String,
            enum: {
                values: ['available', 'busy', 'part-time'],
                message: 'Availability must be available, busy, or part-time',
            },
            default: 'available',
        },
        bio: {
            type: String,
            default: '',
            maxlength: [500, 'Bio cannot exceed 500 characters'],
        },
        pushToken: {
            type: String,
            default: null,
        },
        avatar: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret: Record<string, unknown>) {
                delete ret['password'];
                delete ret['__v'];
                return ret;
            },
        },
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ skills: 1 });
UserSchema.index({ availability: 1 });

// ─── Pre-save Hook: Hash Password ─────────────────────────────────────────────
UserSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ─── Instance Method: Compare Password ───────────────────────────────────────
UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// ─── Model ────────────────────────────────────────────────────────────────────
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;
