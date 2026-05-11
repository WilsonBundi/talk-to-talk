import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireRole, AuthRequest } from '../middleware/auth';
import Media from '../models/media';
import Comment from '../models/comment';
import Rating from '../models/rating';
import { createMediaUploadUrl } from '../utils/blob';
import { getCached, setCached } from '../utils/cache';
import {
  mediaStore,
  commentsStore,
  ratingsStore,
  createMediaItem,
  createComment,
  createRating,
  MediaItem
} from '../data/inMemoryStore';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const useInMemory = !process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<user>');

// Configure multer for local file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = `${Date.now()}-${sanitizedName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 12), 50);
    const cacheKey = `media:page:${page}:limit:${limit}`;
    const cached = await getCached(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const media = useInMemory
      ? mediaStore.slice((page - 1) * limit, page * limit)
      : await Media.find()
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

    const response = { data: media };
    await setCached(cacheKey, JSON.stringify(response), 60);
    return res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const media = useInMemory
      ? mediaStore.find((item) => item._id === req.params.id)
      : await Media.findById(req.params.id).lean();

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const comments = useInMemory
      ? commentsStore.filter((item) => item.mediaId === req.params.id)
      : await Comment.find({ mediaId: media._id.toString() }).sort({ createdAt: -1 });
    const ratings = useInMemory
      ? ratingsStore.filter((item) => item.mediaId === req.params.id)
      : await Rating.find({ mediaId: media._id.toString() });

    const averageRating = ratings.length ? ratings.reduce((sum, item) => sum + item.score, 0) / ratings.length : 0;
    return res.json({ media, comments, averageRating, ratingCount: ratings.length });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/upload-url',
  requireRole(['creator']),
  body('filename').isString().notEmpty(),
  body('contentType').isString().notEmpty(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { filename, contentType } = req.body;
      if (useInMemory) {
        // Return local upload URL for development
        const apiPort = process.env.PORT || '5000';
        const uploadUrl = `http://localhost:${apiPort}/media/upload`;
        const blobUrl = `http://localhost:${apiPort}/media/files/${filename}`;
        return res.json({ uploadUrl, blobUrl });
      }
      const result = await createMediaUploadUrl(filename, contentType);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/upload',
  requireRole(['creator']),
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const apiPort = process.env.PORT || '5000';
      const fileUrl = `http://localhost:${apiPort}/media/files/${req.file.filename}`;
      return res.json({ url: fileUrl });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/files/:filename',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filePath = path.join(__dirname, '../../uploads', req.params.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      
      const contentType = contentTypeMap[ext] || 'application/octet-stream';
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=3600');
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  requireRole(['creator']),
  body('title').isString().notEmpty(),
  body('caption').isString().notEmpty(),
  body('mediaUrl').isURL({ require_tld: false }),
  body('mediaType').isString().notEmpty(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, caption, location, tags, mediaUrl, mediaType, taggedPeople } = req.body;
      const media = useInMemory
        ? createMediaItem({
            title,
            caption,
            location,
            tags: Array.isArray(tags) ? tags : [],
            taggedPeople: Array.isArray(taggedPeople) ? taggedPeople : [],
            mediaUrl,
            mediaType,
            uploaderId: req.user!.uid
          })
        : await Media.create({
            title,
            caption,
            location,
            tags: Array.isArray(tags) ? tags : [],
            taggedPeople: Array.isArray(taggedPeople) ? taggedPeople : [],
            mediaUrl,
            mediaType,
            uploaderId: req.user!.uid
          });
      return res.status(201).json({ media });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/comment',
  requireRole(['consumer']),
  body('text').isString().notEmpty(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const comment = useInMemory
        ? createComment({
            mediaId: req.params.id,
            userId: req.user!.uid,
            text: req.body.text
          })
        : await Comment.create({
            mediaId: req.params.id,
            userId: req.user!.uid,
            text: req.body.text
          });
      return res.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/rate',
  requireRole(['consumer']),
  body('score').isInt({ min: 1, max: 5 }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      if (useInMemory) {
        let existing = ratingsStore.find((item) => item.mediaId === req.params.id && item.userId === req.user!.uid);
        if (existing) {
          existing.score = req.body.score;
          return res.json({ rating: existing });
        }
        const rating = createRating({
          mediaId: req.params.id,
          userId: req.user!.uid,
          score: req.body.score
        });
        return res.status(201).json({ rating });
      }

      const existing = await Rating.findOne({ mediaId: req.params.id, userId: req.user!.uid });
      if (existing) {
        existing.score = req.body.score;
        await existing.save();
        return res.json({ rating: existing });
      }
      const rating = await Rating.create({
        mediaId: req.params.id,
        userId: req.user!.uid,
        score: req.body.score
      });
      return res.status(201).json({ rating });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  requireRole(['creator']),
  body('title').optional().isString(),
  body('caption').optional().isString(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (useInMemory) {
        const media = mediaStore.find((item) => item._id === req.params.id);
        if (!media) {
          return res.status(404).json({ error: 'Media not found' });
        }
        if (media.uploaderId !== req.user!.uid) {
          return res.status(403).json({ error: 'You can only edit your own media' });
        }
        if (req.body.title) media.title = req.body.title;
        if (req.body.caption) media.caption = req.body.caption;
        return res.json({ media });
      }

      const media = await Media.findById(req.params.id);
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      if (media.uploaderId.toString() !== req.user!.uid) {
        return res.status(403).json({ error: 'You can only edit your own media' });
      }
      if (req.body.title) media.title = req.body.title;
      if (req.body.caption) media.caption = req.body.caption;
      await media.save();
      return res.json({ media });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  requireRole(['creator']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (useInMemory) {
        const index = mediaStore.findIndex((item) => item._id === req.params.id);
        if (index === -1) {
          return res.status(404).json({ error: 'Media not found' });
        }
        const media = mediaStore[index];
        if (media.uploaderId !== req.user!.uid) {
          return res.status(403).json({ error: 'You can only delete your own media' });
        }
        mediaStore.splice(index, 1);
        commentsStore.splice(0, commentsStore.length, ...commentsStore.filter((c) => c.mediaId !== req.params.id));
        ratingsStore.splice(0, ratingsStore.length, ...ratingsStore.filter((r) => r.mediaId !== req.params.id));
        return res.json({ message: 'Media deleted' });
      }

      const media = await Media.findById(req.params.id);
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      if (media.uploaderId.toString() !== req.user!.uid) {
        return res.status(403).json({ error: 'You can only delete your own media' });
      }
      await Media.deleteOne({ _id: req.params.id });
      await Comment.deleteMany({ mediaId: req.params.id });
      await Rating.deleteMany({ mediaId: req.params.id });
      return res.json({ message: 'Media deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
