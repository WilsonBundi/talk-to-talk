import { Router, Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import Media from '../models/media';
import { getCached, setCached } from '../utils/cache';
import { mediaStore } from '../data/inMemoryStore';

const router = Router();
const useInMemory = !process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<user>');

router.get(
  '/',
  query('q').optional().isString(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const queryValue = (req.query.q as string) || '';
      const cacheKey = `search:${queryValue}`;
      const cached = await getCached(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const media = useInMemory
        ? mediaStore.filter((item) =>
            queryValue
              ? [item.title, item.caption, item.location, ...(item.tags || [])]
                  .join(' ')
                  .toLowerCase()
                  .includes(queryValue.toLowerCase())
              : true
          )
        : queryValue
            ? await Media.find({ $text: { $search: queryValue } }).sort({ createdAt: -1 }).lean()
            : await Media.find().sort({ createdAt: -1 }).limit(50).lean();

      const response = { data: media };
      await setCached(cacheKey, JSON.stringify(response), 60);
      return res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
