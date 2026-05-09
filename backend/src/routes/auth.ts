import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcryptjs from 'bcryptjs';
import { SignJWT } from 'jose';
import { requireRole, AuthRequest, verifyAzureJwt } from '../middleware/auth';
import User from '../models/user';
import CreatorRequest from '../models/creatorRequest';

// In-memory user store for development (only used when MongoDB is not configured)
interface User {
  _id: string;
  username: string;
  password: string;
  email: string;
  displayName: string;
  role: 'creator' | 'consumer';
  createdAt: Date;
}

const users: User[] = [];
let userIdCounter = 1;
const useInMemory = !process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<user>');

// Seed default test accounts for development
const seedDefaultAccounts = async () => {
  if (users.length === 0 && useInMemory) {
    const hashedCreatorPassword = await bcryptjs.hash('creator123', 10);
    const hashedConsumerPassword = await bcryptjs.hash('consumer123', 10);
    
    users.push({
      _id: '1',
      username: 'creator_admin',
      password: hashedCreatorPassword,
      email: 'creator@example.com',
      displayName: 'Creator Admin',
      role: 'creator',
      createdAt: new Date()
    });
    
    users.push({
      _id: '2',
      username: 'consumer_user',
      password: hashedConsumerPassword,
      email: 'consumer@example.com',
      displayName: 'Consumer User',
      role: 'consumer',
      createdAt: new Date()
    });
    
    userIdCounter = 3;
  }
};

// Initialize default accounts when module loads
seedDefaultAccounts();

// Store for creator requests
interface CreatorRequest {
  userId: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
}

const creatorRequests: CreatorRequest[] = [];

const router = Router();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

router.post(
  '/register',
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  body('displayName').notEmpty().withMessage('Display name is required'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, password, email, displayName, role = 'consumer' } = req.body;

      if (useInMemory) {
        const existing = users.find(u => u.username === username || u.email === email);
        if (existing) {
          return res.status(400).json({ error: 'Username or email already in use' });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);
        const user: User = {
          _id: userIdCounter.toString(),
          username,
          password: hashedPassword,
          email,
          displayName,
          role,
          createdAt: new Date()
        };
        users.push(user);
        userIdCounter++;

        const token = await new SignJWT({ userId: user._id, username: user.username, role: user.role })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('7d')
          .sign(JWT_SECRET);

        return res.json({ user: { _id: user._id, username: user.username, email: user.email, displayName: user.displayName, role: user.role }, token });
      } else {
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
          return res.status(400).json({ error: 'Username or email already in use' });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);
        const user = new User({
          username,
          password: hashedPassword,
          email,
          displayName,
          role
        });
        await user.save();

        const token = await new SignJWT({ userId: user._id.toString(), username: user.username, role: user.role })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('7d')
          .sign(JWT_SECRET);

        return res.json({ user: { _id: user._id, username: user.username, email: user.email, displayName: user.displayName, role: user.role }, token });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, password } = req.body;

      if (useInMemory) {
        const user = users.find(u => u.username === username);
        if (!user || !(await bcryptjs.compare(password, user.password))) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = await new SignJWT({ userId: user._id, username: user.username, role: user.role })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('7d')
          .sign(JWT_SECRET);

        return res.json({ user: { _id: user._id, username: user.username, email: user.email, displayName: user.displayName, role: user.role }, token });
      } else {
        const user = await User.findOne({ username });
        if (!user || !(await bcryptjs.compare(password, user.password))) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = await new SignJWT({ userId: user._id.toString(), username: user.username, role: user.role })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('7d')
          .sign(JWT_SECRET);

        return res.json({ user: { _id: user._id, username: user.username, email: user.email, displayName: user.displayName, role: user.role }, token });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/request-creator',
  verifyAzureJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as any;
      const userId = authReq.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (useInMemory) {
        const user = users.find(u => u._id === userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // If already a creator
        if (user.role === 'creator') {
          return res.json({ status: 'already_creator', message: 'User is already a creator' });
        }

        // Check if already has a pending request
        const existingRequest = creatorRequests.find(r => r.userId === userId && r.status === 'pending');
        if (existingRequest) {
          return res.json({ status: 'already_requested', message: 'Creator request already pending' });
        }

        // Create new request
        const request: CreatorRequest = {
          userId,
          username: user.username,
          status: 'pending',
          createdAt: new Date()
        };
        creatorRequests.push(request);

        return res.json({ status: 'success', message: 'Creator request submitted', request });
      } else {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // If already a creator
        if (user.role === 'creator') {
          return res.json({ status: 'already_creator', message: 'User is already a creator' });
        }

        // Check if already has a pending request
        const existingRequest = await CreatorRequest.findOne({ userId, status: 'pending' });
        if (existingRequest) {
          return res.json({ status: 'already_requested', message: 'Creator request already pending' });
        }

        // Create new request
        const request = new CreatorRequest({
          userId,
          username: user.username,
          status: 'pending'
        });
        await request.save();

        return res.json({ status: 'success', message: 'Creator request submitted', request });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.get('/request-status', verifyAzureJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (useInMemory) {
      const user = users.find(u => u._id === userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const existingRequest = creatorRequests.find(r => r.userId === userId && r.status === 'pending');
      return res.json({ status: user.role === 'creator' ? 'creator' : existingRequest ? 'pending' : 'none', request: existingRequest || null });
    } else {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const existingRequest = await CreatorRequest.findOne({ userId, status: 'pending' });
      return res.json({ status: user.role === 'creator' ? 'creator' : existingRequest ? 'pending' : 'none', request: existingRequest || null });
    }
  } catch (error) {
    next(error);
  }
});

// Get creator requests (for admin/creators to review)
router.get('/creator-requests', verifyAzureJwt, requireRole(['creator']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (useInMemory) {
      const requests = creatorRequests.filter(r => r.status === 'pending');
      console.log('Pending creator requests (in-memory):', requests);
      return res.json({ requests });
    } else {
      const requests = await CreatorRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
      console.log('Pending creator requests (MongoDB):', requests);
      return res.json({ requests });
    }
  } catch (error) {
    console.error('Error fetching creator requests:', error);
    next(error);
  }
});

// Cancel creator request
router.post('/cancel-creator-request', verifyAzureJwt, requireRole(['consumer']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.uid;
    console.log('Cancelling request for userId:', userId);
    if (useInMemory) {
      const requestIndex = creatorRequests.findIndex(r => r.userId === userId && r.status === 'pending');
      console.log('Request index:', requestIndex);
      if (requestIndex !== -1) {
        creatorRequests[requestIndex].status = 'cancelled';
      }
      return res.json({ status: 'cancelled', message: 'Creator request cancelled' });
    } else {
      const request = await CreatorRequest.findOneAndUpdate(
        { userId, status: 'pending' },
        { status: 'cancelled' },
        { new: true }
      );
      console.log('Found request:', request);
      return res.json({ status: 'cancelled', message: 'Creator request cancelled' });
    }
  } catch (error) {
    console.error('Error cancelling request:', error);
    next(error);
  }
});

// Approve creator request
router.post('/approve-creator/:id', verifyAzureJwt, requireRole(['creator']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (authReq.user?.username !== 'creator_admin') {
      return res.status(403).json({ error: 'Only the admin creator can approve requests' });
    }
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (useInMemory) {
      const requestIndex = creatorRequests.findIndex(r => r.userId === id && r.status === 'pending');
      if (requestIndex === -1) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (action === 'approve') {
        creatorRequests[requestIndex].status = 'approved';
        // Update user role
        const user = users.find(u => u._id === id);
        if (user) {
          user.role = 'creator';
        }
      } else if (action === 'reject') {
        creatorRequests[requestIndex].status = 'rejected';
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      return res.json({ status: 'success', message: `Request ${action}d` });
    } else {
      const request = await CreatorRequest.findOne({ userId: id, status: 'pending' });
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (action === 'approve') {
        request.status = 'approved';
        await request.save();
        // Update user role
        await User.findByIdAndUpdate(id, { role: 'creator' });
      } else if (action === 'reject') {
        request.status = 'rejected';
        await request.save();
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      return res.json({ status: 'success', message: `Request ${action}d` });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
