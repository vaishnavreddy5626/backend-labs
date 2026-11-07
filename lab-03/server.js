// Lab 3: REST API, query parameters, validation, and debugging
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'goodreads.db');
let db = null;

// Initial sample catalog if DB is unseeded
const initialBooks = [
  { title: "To Kill a Mockingbird", author: "Harper Lee", price: 399, pages: 281 },
  { title: "1984", author: "George Orwell", price: 299, pages: 328 },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", price: 249, pages: 180 },
  { title: "One Hundred Years of Solitude", author: "Gabriel Garcia Marquez", price: 499, pages: 417 },
  { title: "Pride and Prejudice", author: "Jane Austen", price: 199, pages: 279 },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", price: 349, pages: 234 },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", price: 450, pages: 671 },
  { title: "The Hobbit", author: "J.R.R. Tolkien", price: 399, pages: 310 },
  { title: "Brave New World", author: "Aldous Huxley", price: 320, pages: 268 },
  { title: "The Alchemist", author: "Paulo Coelho", price: 299, pages: 208 }
];

// Async function to initialize DB connection and start server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Ensure book table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      );
    `);

    // Seed if empty
    const countResult = await db.get(`SELECT COUNT(*) as count FROM book;`);
    if (countResult.count === 0) {
      for (const book of initialBooks) {
        await db.run(
          `INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);`,
          [book.title, book.author, book.price, book.pages]
        );
      }
      console.log('Database initialized and seeded.');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
    return server;
  } catch (error) {
    console.error(`DB Initialization Error: ${error.message}`);
    process.exit(1);
  }
};

// Input validation middleware for POST and PUT bodies
const validateBookPayload = (req, res, next) => {
  const { title, author, price, pages } = req.body;

  if (title === undefined || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      message: "Invalid input: 'title' is required and must be a non-empty string."
    });
  }

  if (author === undefined || typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({
      message: "Invalid input: 'author' is required and must be a non-empty string."
    });
  }

  const numericPrice = Number(price);
  if (price === undefined || isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({
      message: "Invalid input: 'price' is required and must be a non-negative number."
    });
  }

  const numericPages = Number(pages);
  if (pages === undefined || isNaN(numericPages) || !Number.isInteger(numericPages) || numericPages <= 0) {
    return res.status(400).json({
      message: "Invalid input: 'pages' is required and must be a positive integer."
    });
  }

  // Attach sanitized data to request
  req.sanitizedBook = {
    title: title.trim(),
    author: author.trim(),
    price: numericPrice,
    pages: numericPages
  };

  next();
};

// Root endpoint: API Documentation & Student Info
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Lab 3: REST API, query parameters, validation, and debugging",
    student: {
      name: "Vaishniv Reddy",
      regNo: "252U1R1171",
      section: "CSE-2D 214",
      faculty: "SHIVA SAI TEJA"
    },
    supportedQueryParameters: {
      search_q: "Filter books by partial title match (case-insensitive LIKE)",
      min_price: "Minimum price threshold (number)",
      max_price: "Maximum price threshold (number)",
      order_by: "Field to sort by ('id', 'title', 'price', 'pages') [default: 'id']",
      order: "Sort direction ('ASC' or 'DESC') [default: 'ASC']",
      limit: "Number of books to return per page [default: 10]",
      offset: "Number of books to skip for pagination [default: 0]"
    },
    endpoints: {
      listBooks: "GET /books/?search_q=great&min_price=200&max_price=500&order_by=price&order=DESC&limit=5&offset=0",
      getBook: "GET /books/:bookId/",
      createBook: "POST /books/",
      updateBook: "PUT /books/:bookId/",
      deleteBook: "DELETE /books/:bookId/"
    }
  });
});

// Endpoint 1: GET /books/ - List books with query parameters (search, filter, sort, paginate)
app.get('/books/', async (req, res) => {
  try {
    const {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit = 10,
      offset = 0,
      min_price,
      max_price
    } = req.query;

    // Allowed columns to prevent SQL injection in ORDER BY clause
    const allowedSortColumns = ['id', 'title', 'author', 'price', 'pages'];
    const sortColumn = allowedSortColumns.includes(order_by.toLowerCase())
      ? order_by.toLowerCase()
      : 'id';

    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    // Build parameterized conditions
    const conditions = [];
    const params = [];

    // Title search with LIKE %...%
    if (search_q && search_q.trim() !== '') {
      conditions.push(`title LIKE ?`);
      params.push(`%${search_q.trim()}%`);
    }

    // Price range filters
    if (min_price !== undefined && max_price !== undefined && !isNaN(Number(min_price)) && !isNaN(Number(max_price))) {
      conditions.push(`price BETWEEN ? AND ?`);
      params.push(Number(min_price), Number(max_price));
    } else {
      if (min_price !== undefined && !isNaN(Number(min_price))) {
        conditions.push(`price >= ?`);
        params.push(Number(min_price));
      }
      if (max_price !== undefined && !isNaN(Number(max_price))) {
        conditions.push(`price <= ?`);
        params.push(Number(max_price));
      }
    }

    let query = `SELECT * FROM book`;
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?;`;
    params.push(parsedLimit, parsedOffset);

    const books = await db.all(query, params);

    // Optional metadata for pagination
    let countQuery = `SELECT COUNT(*) as total FROM book`;
    const countParams = params.slice(0, params.length - 2); // Exclude LIMIT and OFFSET
    if (conditions.length > 0) {
      countQuery += ` WHERE ` + conditions.join(' AND ');
    }
    const totalCount = await db.get(countQuery, countParams);

    res.status(200).json({
      total: totalCount ? totalCount.total : books.length,
      count: books.length,
      limit: parsedLimit,
      offset: parsedOffset,
      books: books
    });
  } catch (err) {
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// Endpoint 2: GET /books/:bookId/ - Retrieve a single book
app.get('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const query = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(query, [bookId]);

    if (!book) {
      return res.status(404).json({
        message: `Book with ID ${bookId} not found.`
      });
    }

    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// Endpoint 3: POST /books/ - Add new book with validation
app.post('/books/', validateBookPayload, async (req, res) => {
  try {
    const { title, author, price, pages } = req.sanitizedBook;
    const insertQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(insertQuery, [title, author, price, pages]);

    res.status(201).json({
      message: "Book created successfully",
      bookId: dbResponse.lastID
    });
  } catch (err) {
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// Endpoint 4: PUT /books/:bookId/ - Update an existing book with validation
app.put('/books/:bookId/', validateBookPayload, async (req, res) => {
  try {
    const { bookId } = req.params;
    const existingBook = await db.get(`SELECT * FROM book WHERE id = ?;`, [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        message: `Book with ID ${bookId} not found.`
      });
    }

    const { title, author, price, pages } = req.sanitizedBook;
    const updateQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateQuery, [title, author, price, pages, bookId]);

    res.status(200).json({
      message: "Book updated successfully"
    });
  } catch (err) {
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// Endpoint 5: DELETE /books/:bookId/ - Remove a book
app.delete('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const existingBook = await db.get(`SELECT * FROM book WHERE id = ?;`, [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        message: `Book with ID ${bookId} not found.`
      });
    }

    const deleteQuery = `DELETE FROM book WHERE id = ?;`;
    await db.run(deleteQuery, [bookId]);

    res.status(200).json({
      message: "Book deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// Fallback 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: `Path '${req.originalUrl}' does not exist on this server.`
  });
});

if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer };
