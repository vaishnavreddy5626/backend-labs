// Lab 1: Task 3 - Plain server using Node.js built-in 'http' module
const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Log incoming request details
  console.log(`[Native HTTP] Received ${req.method} request for: ${req.url}`);

  // Set HTTP response header
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });

  // Send response body
  res.end('Hello');
});

server.listen(PORT, () => {
  console.log(`Native HTTP server running at http://localhost:${PORT}/`);
});

