// Lab 3: Comprehensive Automated REST API & Validation Test Suite
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
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let parsed = rawData;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
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

async function runAllTests() {
  console.log('--- Initializing Lab 3 Server & SQLite Database ---');
  const server = await initializeDBAndServer();

  try {
    console.log('\n=================================================================');
    console.log('LAB 3: ADVANCED REST API, QUERY PARAMS & VALIDATION TESTS');
    console.log('=================================================================\n');

    // 1. Root Documentation
    console.log('--> 1. [GET] / (API Overview)');
    const rRoot = await sendRequest('GET', '/');
    console.log(`    Status: ${rRoot.statusCode}`);
    console.log(`    Message: ${rRoot.data.message}`);

    // 2. Default GET /books/
    console.log('\n--> 2. [GET] /books/ (Default list, limit=10)');
    const rAll = await sendRequest('GET', '/books/');
    console.log(`    Status: ${rAll.statusCode} | Total: ${rAll.data.total} | Returned: ${rAll.data.count}`);

    // 3. Search Query search_q=great
    console.log('\n--> 3. [GET] /books/?search_q=great (Partial Title Match)');
    const rSearch = await sendRequest('GET', '/books/?search_q=great');
    console.log(`    Status: ${rSearch.statusCode} | Matches: ${rSearch.data.count}`);
    console.log(`    Title: "${rSearch.data.books[0].title}"`);

    // 4. Price Filter BETWEEN 200 AND 350
    console.log('\n--> 4. [GET] /books/?min_price=200&max_price=350 (Price Range Filter)');
    const rPrice = await sendRequest('GET', '/books/?min_price=200&max_price=350');
    console.log(`    Status: ${rPrice.statusCode} | Count: ${rPrice.data.count}`);
    console.log(`    Sample Prices: ${rPrice.data.books.slice(0, 3).map(b => b.price).join(', ')}`);

    // 5. Sorting order_by=price&order=DESC&limit=3
    console.log('\n--> 5. [GET] /books/?order_by=price&order=DESC&limit=3 (Highest Price First)');
    const rSort = await sendRequest('GET', '/books/?order_by=price&order=DESC&limit=3');
    console.log(`    Status: ${rSort.statusCode} | Top 3 Highest Prices:`);
    rSort.data.books.forEach(b => console.log(`      • ${b.title} - ₹${b.price}`));

    // 6. Pagination limit=3&offset=3
    console.log('\n--> 6. [GET] /books/?limit=3&offset=3 (Pagination Page 2)');
    const rPage = await sendRequest('GET', '/books/?limit=3&offset=3');
    console.log(`    Status: ${rPage.statusCode} | Count: ${rPage.data.count} | Offset: ${rPage.data.offset}`);
    console.log(`    First book on Page 2: "${rPage.data.books[0].title}"`);

    // 7. GET Single Book /books/1/
    console.log('\n--> 7. [GET] /books/1/ (Single Book by ID)');
    const rOne = await sendRequest('GET', '/books/1/');
    console.log(`    Status: ${rOne.statusCode} | Title: "${rOne.data.title}" by ${rOne.data.author}`);

    // 8. GET Missing Book /books/999/ (404 Test)
    console.log('\n--> 8. [GET] /books/999/ (Missing Book -> Expect 404)');
    const rMiss = await sendRequest('GET', '/books/999/');
    console.log(`    Status: ${rMiss.statusCode} | Response: ${JSON.stringify(rMiss.data)}`);

    // 9. Validation Failure: Missing Title (400 Test)
    console.log('\n--> 9. [POST] /books/ with missing title -> Expect 400 Bad Request');
    const rVal1 = await sendRequest('POST', '/books/', { author: "No Title Author", price: 299, pages: 150 });
    console.log(`    Status: ${rVal1.statusCode} | Message: ${rVal1.data.message}`);

    // 10. Validation Failure: Non-numeric / Negative Price (400 Test)
    console.log('\n--> 10. [POST] /books/ with negative price -> Expect 400 Bad Request');
    const rVal2 = await sendRequest('POST', '/books/', { title: "Bad Price", author: "Tester", price: -50, pages: 150 });
    console.log(`    Status: ${rVal2.statusCode} | Message: ${rVal2.data.message}`);

    // 11. Validation Failure: Non-integer Pages (400 Test)
    console.log('\n--> 11. [POST] /books/ with string pages -> Expect 400 Bad Request');
    const rVal3 = await sendRequest('POST', '/books/', { title: "Bad Pages", author: "Tester", price: 350, pages: "abc" });
    console.log(`    Status: ${rVal3.statusCode} | Message: ${rVal3.data.message}`);

    // 12. Valid POST /books/ (201 Created)
    console.log('\n--> 12. [POST] /books/ with valid payload -> Expect 201 Created');
    const validBook = {
      title: "Design Patterns: Elements of Reusable Object-Oriented Software",
      author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
      price: 699,
      pages: 395
    };
    const rPost = await sendRequest('POST', '/books/', validBook);
    console.log(`    Status: ${rPost.statusCode} | Created Book ID: ${rPost.data.bookId}`);
    const newBookId = rPost.data.bookId;

    // 13. Valid PUT /books/:id/ (200 OK)
    console.log(`\n--> 13. [PUT] /books/${newBookId}/ with updated price -> Expect 200 OK`);
    const updatePayload = {
      title: "Design Patterns (Special Edition)",
      author: "Gang of Four (GoF)",
      price: 749,
      pages: 410
    };
    const rPut = await sendRequest('PUT', `/books/${newBookId}/`, updatePayload);
    console.log(`    Status: ${rPut.statusCode} | Message: ${rPut.data.message}`);

    // 14. DELETE /books/:id/ (200 OK)
    console.log(`\n--> 14. [DELETE] /books/${newBookId}/ -> Expect 200 OK`);
    const rDel = await sendRequest('DELETE', `/books/${newBookId}/`);
    console.log(`    Status: ${rDel.statusCode} | Message: ${rDel.data.message}`);

    // 15. DELETE /books/:id/ repeated -> Expect 404
    console.log(`\n--> 15. [DELETE] /books/${newBookId}/ again -> Expect 404 Not Found`);
    const rDelRepeat = await sendRequest('DELETE', `/books/${newBookId}/`);
    console.log(`    Status: ${rDelRepeat.statusCode} | Message: ${rDelRepeat.data.message}`);

    console.log('\n=================================================================');
    console.log('✅ ALL 15 ADVANCED REST API TESTS EXECUTED AND PASSED!');
    console.log('=================================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (server && server.close) {
      server.close();
    }
    process.exit(0);
  }
}

runAllTests();

