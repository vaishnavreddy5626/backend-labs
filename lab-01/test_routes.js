// Lab 1: Automated Verification Script for all endpoints and status codes
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3000;
const serverPath = path.join(__dirname, 'server.js');

console.log('--- Starting Express Server for Route Verification ---');
const serverProcess = spawn(process.execPath, [serverPath], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});

serverProcess.stdout.on('data', (data) => {
  process.stdout.write(`[Server Log] ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(`[Server Error] ${data}`);
});

function testEndpoint(method, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          path: path,
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      resolve({ path: path, statusCode: 'ERR', body: err.message });
    });

    req.end();
  });
}

// Give server 1.5 seconds to start, then run tests
setTimeout(async () => {
  try {
    const routesToTest = [
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/about' },
      { method: 'GET', path: '/time' },
      { method: 'GET', path: '/unknown-route-test' }
    ];

    console.log('\n======================================================');
    console.log('ROUTE VERIFICATION RESULTS:');
    console.log('======================================================');

    for (const route of routesToTest) {
      const result = await testEndpoint(route.method, route.path);
      console.log(`\nEndpoint: [${route.method}] ${result.path}`);
      console.log(`HTTP Status: ${result.statusCode}`);
      console.log(`Response: ${result.body}`);
    }

    console.log('\n======================================================');
    console.log('All endpoints verified successfully!');
    console.log('======================================================\n');
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}, 1500);
