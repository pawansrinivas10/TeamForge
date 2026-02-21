import { Request, Response, NextFunction } from 'express';

// ─── Custom Error Class ───────────────────────────────────────────────────────
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// ─── 404 Not Found Handler ────────────────────────────────────────────────────
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// ─── Global Error Handler ─────────────────────────────────────────────────────
export const errorHandler = (
    err: AppError & { code?: number; keyValue?: Record<string, string> },
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // ── Mongoose Duplicate Key ────────────────────────────────────────────────
    if (err.code === 11000 && err.keyValue) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `A user with that ${field} already exists.`;
    }

    // ── Mongoose Validation Error ─────────────────────────────────────────────
    if (err.name === 'ValidationError') {
        statusCode = 422;
        // err.message already contains detailed Mongoose validation messages
        message = err.message;
    }

    // ── Mongoose CastError (invalid ObjectId) ─────────────────────────────────
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid resource ID format.';
    }

    const isDev = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
        success: false,
        message,
        ...(isDev && { stack: err.stack }),
    });
};
