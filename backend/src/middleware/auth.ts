import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// ─── Augment Express Request ──────────────────────────────────────────────────
export interface AuthRequest extends Request {
    user?: IUser;
}

// ─── JWT Verification Middleware ─────────────────────────────────────────────
export const protect = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    let token: string | undefined;

    // Support both Bearer token in header and token in cookie
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.',
        });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is not configured');

        const decoded = jwt.verify(token, secret) as { id: string; iat: number; exp: number };

        // Attach user to request (without password)
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Token is valid but user no longer exists.',
            });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ success: false, message: 'Token has expired.' });
        } else if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ success: false, message: 'Invalid token.' });
        } else {
            next(error);
        }
    }
};

// ─── JWT Token Generator Helper ──────────────────────────────────────────────
export const generateToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');

    return jwt.sign({ id: userId }, secret, {
        expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '7d',
    });
};
