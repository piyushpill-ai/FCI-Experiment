const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files with proper configuration
app.use(express.static(path.join(__dirname, 'dist'), {
  index: false,  // Don't serve index.html automatically for directory requests
  setHeaders: (res, path) => {
    // Set correct MIME types for ES modules
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: 'FCI Experiment' });
});

// API endpoints
app.get('/api', (req, res) => {
  res.json({
    message: 'FCI Experiment API',
    status: 'running',
    endpoints: ['/health', '/api']
  });
});

// Serve React app for all other routes (but not static assets)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FCI Experiment running on port ${PORT}`);
});
