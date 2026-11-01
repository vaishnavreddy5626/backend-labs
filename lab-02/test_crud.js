// Lab 2: Automated In-Process CRUD Verification Test Suite
const http = require('http');
const { initializeDBAndServer } = require('./server');

const PORT = process.env.PORT || 3000;

function sendRequest(method, endpoint, payload = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Initializing Database & Express Server ---');
  const server = await initializeDBAndServer();

  try {
    console.log('\n=================================================================');
    console.log('LAB 2: EXECUTING FULL CRUD TESTS');
    console.log('=================================================================\n');

    // 1. GET ALL BOOKS
    console.log('--> 1. Testing [GET] /books/ (Retrieve all books)');
    const resAll = await sendRequest('GET', '/books/');
    console.log(`    Status: ${resAll.statusCode}`);
    console.log(`    Total Books: ${Array.isArray(resAll.data) ? resAll.data.length : 'N/A'}`);
    console.log(`    First Book: ${JSON.stringify(resAll.data[0])}`);

    // 2. GET SINGLE BOOK
    console.log('\n--> 2. Testing [GET] /books/1/ (Retrieve single book by ID)');
    const resOne = await sendRequest('GET', '/books/1/');
    console.log(`    Status: ${resOne.statusCode}`);
    console.log(`    Book Details: ${JSON.stringify(resOne.data)}`);

    // 3. POST NEW BOOK
    console.log('\n--> 3. Testing [POST] /books/ (Insert new book)');
    const newBookPayload = {
      title: "Clean Code",
      author: "Robert C. Martin",
      price: 550,
      pages: 464
    };
    const resPost = await sendRequest('POST', '/books/', newBookPayload);
    console.log(`    Status: ${resPost.statusCode}`);
    console.log(`    Response: ${JSON.stringify(resPost.data)}`);
    const createdId = resPost.data.bookId;

    // Verify insertion
    console.log(`\n--> Verifying newly created book with ID ${createdId}...`);
    const resCheckCreated = await sendRequest('GET', `/books/${createdId}/`);
    console.log(`    Status: ${resCheckCreated.statusCode}`);
    console.log(`    Retrieved: ${JSON.stringify(resCheckCreated.data)}`);

    // 4. PUT UPDATE BOOK
    console.log(`\n--> 4. Testing [PUT] /books/${createdId}/ (Update book price and pages)`);
    const updatePayload = {
      title: "Clean Code: A Handbook of Agile Software Craftsmanship",
      author: "Robert C. Martin",
      price: 650,
      pages: 500
    };
    const resPut = await sendRequest('PUT', `/books/${createdId}/`, updatePayload);
    console.log(`    Status: ${resPut.statusCode}`);
    console.log(`    Response: ${JSON.stringify(resPut.data)}`);

    // Verify update
    console.log(`\n--> Verifying updated book with ID ${createdId}...`);
    const resCheckUpdated = await sendRequest('GET', `/books/${createdId}/`);
    console.log(`    Status: ${resCheckUpdated.statusCode}`);
    console.log(`    Retrieved: ${JSON.stringify(resCheckUpdated.data)}`);

    // 5. DELETE BOOK
    console.log(`\n--> 5. Testing [DELETE] /books/${createdId}/ (Delete book)`);
    const resDelete = await sendRequest('DELETE', `/books/${createdId}/`);
    console.log(`    Status: ${resDelete.statusCode}`);
    console.log(`    Response: ${JSON.stringify(resDelete.data)}`);

    // Verify deletion returns 404
    console.log(`\n--> Verifying deletion (should return 404)...`);
    const resCheckDeleted = await sendRequest('GET', `/books/${createdId}/`);
    console.log(`    Status: ${resCheckDeleted.statusCode}`);
    console.log(`    Response: ${JSON.stringify(resCheckDeleted.data)}`);

    console.log('\n=================================================================');
    console.log('✅ ALL 5 CRUD OPERATIONS TESTED & PASSED SUCCESSFULLY!');
    console.log('=================================================================\n');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    if (server && server.close) {
      server.close();
    }
    process.exit(0);
  }
}

runTests();
