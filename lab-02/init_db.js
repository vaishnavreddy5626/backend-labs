// Lab 2: Database Initialization and Seeding Script
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const dbPath = path.join(__dirname, 'goodreads.db');

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

async function initializeDatabase() {
  console.log(`Connecting to database at: ${dbPath}`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Creating book table if not exists...');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL,
      pages INTEGER NOT NULL
    );
  `);

  const existingCount = await db.get(`SELECT COUNT(*) as count FROM book;`);
  if (existingCount.count === 0) {
    console.log('Seeding initial 10 books...');
    for (const book of initialBooks) {
      await db.run(
        `INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);`,
        [book.title, book.author, book.price, book.pages]
      );
    }
    console.log('Database seeded with 10 books successfully.');
  } else {
    console.log(`Database already has ${existingCount.count} records.`);
  }

  const allBooks = await db.all(`SELECT * FROM book;`);
  console.table(allBooks);

  await db.close();
  console.log('Database initialization completed.');
}

if (require.main === module) {
  initializeDatabase().catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

module.exports = { initializeDatabase, dbPath };
