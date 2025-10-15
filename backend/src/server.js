const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const { detect } = require('detect-port');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const documentsRoutes = require('./routes/documents.routes');
const tasksRoutes = require('./routes/tasks.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const reportsRoutes = require('./routes/reports.routes');
const usersRoutes = require('./routes/users.routes');
const postsRoutes = require('./routes/posts.routes');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['X-Document-Metadata', 'Content-Disposition']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/api/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'IntraDoc API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server with dynamic port detection
async function startServer() {
  await testConnection(); // Test database connection first
  
  // Detect available port
  const PORT = await detect(DEFAULT_PORT);
  
  if (PORT !== DEFAULT_PORT) {
    console.log(`⚠️  Port ${DEFAULT_PORT} is in use, using port ${PORT} instead`);
  }
  
  // Write the actual port to .env.local for frontend
  const envPath = path.join(__dirname, '../../.env.local');
  const envContent = `VITE_API_URL=http://localhost:${PORT}/api\n`;
  
  try {
    await fs.writeFile(envPath, envContent);
    console.log(`📝 Frontend configuration written to .env.local`);
  } catch (error) {
    console.warn(`⚠️  Could not write .env.local file: ${error.message}`);
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
  });
}

startServer();