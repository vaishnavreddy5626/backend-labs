// Lab 1: Task 4, 5, 6 - Express Server with Routes and 404 Handling
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Logging middleware to log incoming request and status code
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode}`);
  });
  next();
});

// Route 1: GET / (Welcome text)
app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Node.js and Express Lab Server!');
});

// Route 2: GET /about (JSON with name and section)
app.get('/about', (req, res) => {
  res.status(200).json({
    name: 'Vaishniv Reddy',
    registrationNumber: 'REPLACE_WITH_YOUR_REG_NO',
    section: 'REPLACE_WITH_YOUR_SECTION',
    course: 'Backend Development Fundamentals',
    faculty: 'Joel Prashanth D'
  });
});

// Route 3: GET /time (Current date and time using new Date())
app.get('/time', (req, res) => {
  const now = new Date();
  res.status(200).json({
    currentTime: now.toISOString(),
    formattedTime: now.toLocaleString(),
    timestamp: now.getTime()
  });
});

// Route 4: 404 Fallback for any unknown route
app.use((req, res) => {
  res.status(404).json({
    error: '404 Not Found',
    message: `The requested path '${req.originalUrl}' does not exist on this server.`,
    availableRoutes: ['/', '/about', '/time']
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Express server is running on http://localhost:${PORT}`);
});

