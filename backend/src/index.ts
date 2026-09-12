import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file serving for uploads & generated PDF reports
app.use('/storage', express.static(path.join(process.cwd(), 'storage')));

// Mount API Router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LegalLens Backend', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`LegalLens Backend Service running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});
