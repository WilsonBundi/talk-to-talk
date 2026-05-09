import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

export interface AuthRequest extends Request {
  user?: { userId: string; uid: string; username: string; role: string };
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

export const verifyAzureJwt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authorization.split('Bearer ')[1];
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = String(payload.role || 'consumer');
    if (!['creator', 'consumer'].includes(role)) {
      return res.status(401).json({ error: 'Invalid role in token' });
    }
    req.user = {
      userId: String(payload.userId),
      uid: String(payload.userId),
      username: String(payload.username || ''),
      role: role
    };
    next();
  } catch (err) {
    console.error('Token verification failed', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role || 'consumer')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
