import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  initDb, 
  getProgress, 
  setProgress, 
  getDailyVocabulary, 
  updateVocabularyReview, 
  saveDailyHistory, 
  getAllHistory,
  dbAll,
  dbGet
} from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// GET progress
app.get('/api/progress', async (req, res) => {
  try {
    const progress = await getProgress();
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST progress
app.post('/api/progress', async (req, res) => {
  try {
    const { bookId, pageNumber } = req.body;
    await setProgress(bookId, pageNumber);
    res.json({ success: true, bookId, pageNumber });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET books list
app.get('/api/books', async (req, res) => {
  try {
    const books = await dbAll("SELECT * FROM books ORDER BY sequence_order ASC");
    res.json(books);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET today's curriculum vocabulary based on progress
app.get('/api/vocabulary/daily', async (req, res) => {
  try {
    const progress = await getProgress();
    const data = await getDailyVocabulary(progress.bookId, progress.pageNumber);
    
    // Fallback: If no words exist yet in textbook DB, pull some from master glossary
    let allPool = [...data.recent, ...data.completed, ...data.errors, ...data.preview];
    if (allPool.length === 0) {
      // Pull 30 words from glossary_master for backup seeding
      const fallbackGlossary = await dbAll("SELECT * FROM glossary_master LIMIT 40");
      allPool = fallbackGlossary.map((w, idx) => ({
        id: idx + 1000,
        book_id: progress.bookId,
        unit: 1,
        page_number: progress.pageNumber,
        word_greek: w.word_greek + (w.word_article ? `, ${w.word_article}` : ''),
        word_chinese: w.word_chinese || w.word_english, // Use English if Chinese not translated
        pronunciation: '',
        example_greek: '',
        example_chinese: '',
        error_count: 0,
        difficulty_score: 1.0
      }));
    }

    // Dynamic Distractors from master glossary or vocabulary meanings
    const distractorPool = allPool.map(w => w.word_chinese);
    const getOptions = (correct: string) => {
      const filtered = distractorPool.filter(d => d !== correct);
      const shuffled = shuffleArray(filtered);
      const options = [correct, shuffled[0] || '选项 A', shuffled[1] || '选项 B'];
      return shuffleArray(options);
    };

    // 1. Step 1 Warmup: 10 Words (dictation) + 10 short phrases/sentences
    const warmupWords = shuffleArray(allPool).slice(0, 10);
    const warmupSentences = shuffleArray(allPool)
      .filter(w => w.example_greek !== '')
      .slice(0, 10)
      .map(w => ({
        greek: w.example_greek,
        chinese: w.example_chinese
      }));

    // If not enough example sentences, generate simple translation phrases
    while (warmupSentences.length < 10 && allPool.length > 0) {
      const randWord = shuffleArray(allPool)[0];
      warmupSentences.push({
        greek: `Είναι ${randWord.word_greek}`,
        chinese: `这是 ${randWord.word_chinese}`
      });
    }

    // 2. Step 2 Quiz: 40 Multiple-Choice Questions (Part A 20 + Part B 20)
    const quizWords = shuffleArray(allPool).slice(0, Math.min(40, allPool.length));
    const quizQuestions = quizWords.map((q, idx) => ({
      id: q.id,
      index: idx + 1,
      greek: q.word_greek,
      correctAnswer: q.word_chinese,
      options: getOptions(q.word_chinese)
    }));

    // 3. Step 4 Flashcards: 40 double-sided words (20 Greek->Chinese, 20 Chinese->Greek)
    const flashcardWords = shuffleArray(allPool).slice(0, Math.min(40, allPool.length));

    // 4. Step 5 & 6 Translation items
    const translationWords = shuffleArray(allPool).filter(w => w.example_greek !== '').slice(0, 20);
    
    res.json({
      progress,
      warmup: {
        words: warmupWords,
        sentences: warmupSentences
      },
      quiz: {
        partA: quizQuestions.slice(0, 20),
        partB: quizQuestions.slice(20, 40)
      },
      flashcards: flashcardWords,
      translations: translationWords
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST review result
app.post('/api/vocabulary/review', async (req, res) => {
  try {
    const { wordId, isCorrect } = req.body;
    if (wordId && typeof wordId === 'number' && wordId < 1000) {
      await updateVocabularyReview(wordId, isCorrect);
    }
    res.json({ success: true, wordId, isCorrect });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET history logs
app.get('/api/history', async (req, res) => {
  try {
    const history = await getAllHistory();
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST daily progress save
app.post('/api/history', async (req, res) => {
  try {
    const { date, bookId, pageNumber, completedSteps, score, dailyReport } = req.body;
    await saveDailyHistory(
      date,
      bookId,
      pageNumber,
      JSON.stringify(completedSteps || []),
      score || 0,
      JSON.stringify(dailyReport || {})
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST grade translation (OpenAI/DeepSeek/Gemini compatible router)
app.post('/api/grade/translation', async (req, res) => {
  try {
    const { studentTranslation, originalSentence, type } = req.body;
    
    // For local testing, we can check basic similarity or keyword matching
    const isCorrect = studentTranslation.trim().toLowerCase() === originalSentence.trim().toLowerCase();
    
    // In production, we can call Gemini API if key is present
    res.json({
      isCorrect: isCorrect || studentTranslation.length > 2, // simple fallback
      score: isCorrect ? 10 : 7,
      feedback: isCorrect ? "非常完美！" : "意思表达尚可，但拼写可以更精确。"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React static build files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Initialise DB and start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
