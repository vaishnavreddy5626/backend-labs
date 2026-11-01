// Lab 2: SQLite database and CRUD routes
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'goodreads.db');
let db = null;

// Initial sample books to seed if table is empty
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

// Async function to initialize DB and start server only on success
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
      console.log('Database initialized and seeded with 10 books.');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
    return server;
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

// Root endpoint: API Overview
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Lab 2: SQLite database and CRUD routes",
    student: {
      name: "Vaishniv Reddy",
      regNo: "252U1R1171",
      section: "CSE-2D 214",
      faculty: "SHIVA SAI TEJA"
    },
    endpoints: {
      getAllBooks: "GET /books/",
      getBookById: "GET /books/:bookId/",
      addBook: "POST /books/",
      updateBook: "PUT /books/:bookId/",
      deleteBook: "DELETE /books/:bookId/"
    }
  });
});

// Route 1: GET /books/ - Retrieve all books
app.get('/books/', async (req, res) => {
  try {
    const getBooksQuery = `SELECT * FROM book ORDER BY id ASC;`;
    const booksArray = await db.all(getBooksQuery);
    res.status(200).json(booksArray);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 2: GET /books/:bookId/ - Retrieve single book by ID
app.get('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const getBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return res.status(404).json({ error: `Book with id ${bookId} not found` });
    }
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 3: POST /books/ - Add a new book
app.post('/books/', async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;
    if (!title || !author || price === undefined || pages === undefined) {
      return res.status(400).json({ error: "Missing required fields: title, author, price, pages" });
    }

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(addBookQuery, [title, author, price, pages]);
    res.status(201).json({
      message: "Book Added Successfully",
      bookId: dbResponse.lastID
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 4: PUT /books/:bookId/ - Update an existing book
app.put('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, author, price, pages } = req.body;

    const existingBook = await db.get(`SELECT * FROM book WHERE id = ?;`, [bookId]);
    if (!existingBook) {
      return res.status(404).json({ error: `Book with id ${bookId} not found` });
    }

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateBookQuery, [
      title || existingBook.title,
      author || existingBook.author,
      price !== undefined ? price : existingBook.price,
      pages !== undefined ? pages : existingBook.pages,
      bookId
    ]);

    res.status(200).json({ message: "Book Details Updated Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 5: DELETE /books/:bookId/ - Remove a book
app.delete('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const existingBook = await db.get(`SELECT * FROM book WHERE id = ?;`, [bookId]);
    if (!existingBook) {
      return res.status(404).json({ error: `Book with id ${bookId} not found` });
    }

    const deleteBookQuery = `DELETE FROM book WHERE id = ?;`;
    await db.run(deleteBookQuery, [bookId]);
    res.status(200).json({ message: "Book Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "404 Not Found",
    message: `Path '${req.originalUrl}' does not exist on this server.`
  });
});

if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer };
