const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check BEFORE static files
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: 'FCI Experiment' });
});

// API endpoints BEFORE static files  
app.get('/api', (req, res) => {
  res.json({
    message: 'FCI Experiment API',
    status: 'running',
    endpoints: ['/health', '/api']
  });
});

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FCI Experiment running on port ${PORT}`);
});
