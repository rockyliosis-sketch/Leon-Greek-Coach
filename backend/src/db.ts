import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_FILE = path.join(__dirname, '../greek_coach.db');

const db = new sqlite3.Database(DB_FILE);

// Promisified database functions
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

// Interfaces
export interface Book {
  id: string;
  title: string;
  sequence_order: number;
  total_pages: number;
}

export interface Vocabulary {
  id: number;
  book_id: string;
  unit: number;
  page_number: number;
  word_greek: string;
  word_chinese: string;
  pronunciation: string;
  example_greek: string;
  example_chinese: string;
  error_count: number;
  difficulty_score: number;
  last_reviewed_at?: string;
  next_review_at?: string;
}

// Initialise database schema
export async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sequence_order INTEGER NOT NULL,
      total_pages INTEGER DEFAULT 100
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT NOT NULL,
      unit INTEGER NOT NULL,
      page_number INTEGER NOT NULL,
      word_greek TEXT NOT NULL,
      word_chinese TEXT NOT NULL,
      pronunciation TEXT DEFAULT '',
      example_greek TEXT DEFAULT '',
      example_chinese TEXT DEFAULT '',
      error_count INTEGER DEFAULT 0,
      difficulty_score REAL DEFAULT 1.0,
      last_reviewed_at DATETIME,
      next_review_at DATETIME,
      FOREIGN KEY(book_id) REFERENCES books(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS progress (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS daily_history (
      date TEXT PRIMARY KEY, -- YYYY-MM-DD
      book_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      completed_steps TEXT DEFAULT '[]', -- JSON stringified array
      score INTEGER DEFAULT 0,
      daily_report TEXT DEFAULT '',
      FOREIGN KEY(book_id) REFERENCES books(id)
    )
  `);

  // Create Master Glossary Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS glossary_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_greek TEXT NOT NULL UNIQUE,
      word_article TEXT DEFAULT '',
      word_english TEXT NOT NULL,
      word_chinese TEXT DEFAULT ''
    )
  `);

  // Insert default books if they don't exist
  const count = await dbGet<{ total: number }>('SELECT COUNT(*) as total FROM books');
  if (count && count.total === 0) {
    const defaultBooks = [
      { id: 'a1-a', title: "LEON'S GREEK TEXTBOOK A1-A", sequence_order: 0, total_pages: 120 },
      { id: 'a1-b', title: "LEON'S GREEK TEXTBOOK A1-B", sequence_order: 1, total_pages: 120 },
      { id: 'a2', title: "LEON'S GREEK TEXTBOOK A2", sequence_order: 2, total_pages: 150 },
      { id: 'b1', title: "LEON'S GREEK TEXTBOOK B1", sequence_order: 3, total_pages: 180 }
    ];

    for (const b of defaultBooks) {
      await dbRun(
        'INSERT INTO books (id, title, sequence_order, total_pages) VALUES (?, ?, ?, ?)',
        [b.id, b.title, b.sequence_order, b.total_pages]
      );
    }
  }

  // Set default current progress if it doesn't exist
  await dbRun(`INSERT OR IGNORE INTO progress (key, value) VALUES ('current_book_id', 'a1-a')`);
  await dbRun(`INSERT OR IGNORE INTO progress (key, value) VALUES ('current_page_number', '1')`);
}

// Progress Helpers
export async function getProgress(): Promise<{ bookId: string; pageNumber: number }> {
  const bookRow = await dbGet<{ value: string }>("SELECT value FROM progress WHERE key = 'current_book_id'");
  const pageRow = await dbGet<{ value: string }>("SELECT value FROM progress WHERE key = 'current_page_number'");
  
  return {
    bookId: bookRow ? bookRow.value : 'a1-a',
    pageNumber: pageRow ? parseInt(pageRow.value, 10) : 1
  };
}

export async function setProgress(bookId: string, pageNumber: number): Promise<void> {
  await dbRun("INSERT OR REPLACE INTO progress (key, value) VALUES ('current_book_id', ?)", [bookId]);
  await dbRun("INSERT OR REPLACE INTO progress (key, value) VALUES ('current_page_number', ?)", [pageNumber.toString()]);
}

// 30% Early Review / 50% Recent / 20% Preview algorithm
export async function getDailyVocabulary(bookId: string, pageNumber: number) {
  // 1. Get current book sequence order
  const currentBook = await dbGet<Book>("SELECT * FROM books WHERE id = ?", [bookId]);
  if (!currentBook) {
    throw new Error(`Book ${bookId} not found`);
  }

  const seq = currentBook.sequence_order;

  // 2. Fetch completed vocabulary (Book < current OR Book == current AND page < current_page)
  const completedWords = await dbAll<Vocabulary>(`
    SELECT v.* FROM vocabulary v
    INNER JOIN books b ON v.book_id = b.id
    WHERE b.sequence_order < ? 
       OR (v.book_id = ? AND v.page_number < ?)
  `, [seq, bookId, pageNumber]);

  // 3. Fetch recent vocabulary (Book == current AND page in [current_page - 4, current_page])
  const startPage = Math.max(1, pageNumber - 4);
  const recentWords = await dbAll<Vocabulary>(`
    SELECT * FROM vocabulary 
    WHERE book_id = ? AND page_number BETWEEN ? AND ?
  `, [bookId, startPage, pageNumber]);

  // 4. Fetch preview vocabulary (Book == current AND page > current_page)
  const previewWords = await dbAll<Vocabulary>(`
    SELECT * FROM vocabulary 
    WHERE book_id = ? AND page_number = ? + 1
  `, [bookId, pageNumber]);

  // 5. Fetch easy-to-error words (error_count > 0, sorted by highest error count)
  const errorWords = await dbAll<Vocabulary>(`
    SELECT * FROM vocabulary WHERE error_count > 0 ORDER BY error_count DESC LIMIT 20
  `);

  return {
    completed: completedWords,
    recent: recentWords,
    preview: previewWords,
    errors: errorWords
  };
}

// Spaced repetition progress updates
export async function updateVocabularyReview(wordId: number, isCorrect: boolean): Promise<void> {
  const word = await dbGet<Vocabulary>("SELECT * FROM vocabulary WHERE id = ?", [wordId]);
  if (!word) return;

  const errorCount = isCorrect ? word.error_count : word.error_count + 1;
  // Dynamic difficulty adjustment
  let diff = word.difficulty_score;
  if (isCorrect) {
    diff = Math.max(0.5, diff - 0.1); // Make it easier
  } else {
    diff = Math.min(2.5, diff + 0.3); // Make it harder
  }

  const lastReviewed = new Date().toISOString();
  // Simple scheduling multiplier: double the interval on success, set to tomorrow on fail
  let nextReview = new Date();
  if (isCorrect) {
    const daysToAdd = Math.round(1 * (1 / diff) * 2);
    nextReview.setDate(nextReview.getDate() + daysToAdd);
  } else {
    nextReview.setDate(nextReview.getDate() + 1); // Study tomorrow
  }

  await dbRun(`
    UPDATE vocabulary 
    SET error_count = ?, difficulty_score = ?, last_reviewed_at = ?, next_review_at = ?
    WHERE id = ?
  `, [errorCount, diff, lastReviewed, nextReview.toISOString(), wordId]);
}

// History updates
export async function saveDailyHistory(
  date: string,
  bookId: string,
  pageNumber: number,
  completedSteps: string,
  score: number,
  dailyReport: string
): Promise<void> {
  await dbRun(`
    INSERT OR REPLACE INTO daily_history (date, book_id, page_number, completed_steps, score, daily_report)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [date, bookId, pageNumber, completedSteps, score, dailyReport]);
}

export async function getDailyHistory(date: string) {
  return await dbGet("SELECT * FROM daily_history WHERE date = ?", [date]);
}

export async function getAllHistory() {
  return await dbAll("SELECT * FROM daily_history ORDER BY date DESC");
}
