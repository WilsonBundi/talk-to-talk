import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth';
import mediaRoutes from './routes/media';
import searchRoutes from './routes/search';
import { verifyAzureJwt } from './middleware/auth';

// Use a public DNS resolver for Atlas SRV lookups when the default
// resolver is not able to query MongoDB SRV records from this network.
dns.setServers(['8.8.8.8']);

const app = express();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', process.env.FRONTEND_URL || '*'] }));

app.put('/mock-upload/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);
  const writeStream = fs.createWriteStream(filePath);

  req.pipe(writeStream);

  req.on('end', () => {
    res.status(200).json({ success: true });
  });

  req.on('error', (error) => {
    console.error('Mock upload failed', error);
    res.status(500).json({ error: 'Mock upload failed' });
  });
});

app.use('/mock-media', express.static(uploadsDir));

const mongodbUri = process.env.MONGODB_URI?.trim();
const useInMemoryDatabase = !mongodbUri || mongodbUri.includes('<user>') || mongodbUri.includes('<password>') || mongodbUri.includes('<cluster>');
if (!useInMemoryDatabase) {
  console.log('Connecting to MongoDB Atlas...');
  mongoose.connect(mongodbUri!).then(() => {
    console.log('MongoDB connected');
  }).catch((err) => {
    console.error('MongoDB connection failed', err);
    process.exit(1);
  });
} else {
  console.log('MongoDB not configured or using placeholder values - running in-memory development mode');
}

app.get('/', (req, res) => res.json({ 
  message: 'Talk We Talk API',
  version: '1.0.0',
  endpoints: {
    health: '/health',
    auth: '/auth',
    media: '/media',
    search: '/search'
  }
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/media', verifyAzureJwt, mediaRoutes);
app.use('/search', verifyAzureJwt, searchRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
