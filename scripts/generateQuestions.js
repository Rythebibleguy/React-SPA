/**
 * Generate questions.json from Google Sheets
 * Run: npm run generate-questions
 * Output: public/data/questions.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHEET_URLS = {
  easy: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgWBEz01YAfPeiQD7X3HOD9Ra2TGPybmKgpTJZr55PigZgHARwiC1l6kx_AHaHWjlHQy59rAt3yOkE/pub?gid=0&single=true&output=csv",
  medium: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgWBEz01YAfPeiQD7X3HOD9Ra2TGPybmKgpTJZr55PigZgHARwiC1l6kx_AHaHWjlHQy59rAt3yOkE/pub?gid=237222528&single=true&output=csv",
  hard: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgWBEz01YAfPeiQD7X3HOD9Ra2TGPybmKgpTJZr55PigZgHARwiC1l6kx_AHaHWjlHQy59rAt3yOkE/pub?gid=738891339&single=true&output=csv",
  impossible: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgWBEz01YAfPeiQD7X3HOD9Ra2TGPybmKgpTJZr55PigZgHARwiC1l6kx_AHaHWjlHQy59rAt3yOkE/pub?gid=460924046&single=true&output=csv"
};

/**
 * Parse CSV text and extract all questions
 */
function parseAllQuestions(csvText, difficulty) {
  const rows = [];
  let quote = false;
  let col = 0, row = 0;
  
  // Simple CSV Parser
  for (let c = 0; c < csvText.length; c++) {
    let cc = csvText[c], nc = csvText[c + 1];
    rows[row] = rows[row] || [];
    rows[row][col] = rows[row][col] || '';

    if (cc == '"' && quote && nc == '"') { rows[row][col] += cc; ++c; continue; }
    if (cc == '"') { quote = !quote; continue; }
    if (cc == ',' && !quote) { ++col; continue; }
    
    if ((cc == '\r' && nc == '\n' && !quote) || (cc == '\n' && !quote) || (cc == '\r' && !quote)) {
      ++row;
      col = 0;
      if (cc == '\r' && nc == '\n') ++c;
      continue;
    }

    rows[row][col] += cc;
  }

  const questions = [];

  // Parse each row
  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i];
    
    // Skip header row and empty rows
    if (cols.length < 6 || (cols[0] && cols[0].toLowerCase().includes("date"))) continue;
    
    const date = cols[0]?.trim();
    if (!date) continue;
    
    const questionText = cols[1]?.trim();
    const correct = cols[2]?.trim();
    const wrong1 = cols[3]?.trim();
    const wrong2 = cols[4]?.trim();
    const wrong3 = cols[5]?.trim();
    const referenceCitation = cols[6]?.trim() || '';
    const referenceVerse = cols[7]?.trim() || '';

    if (!questionText || !correct || !wrong1 || !wrong2 || !wrong3) continue;

    // Create answers array with permanent IDs (not shuffled in source data)
    const answers = [
      { text: correct, isCorrect: true, id: 0 },
      { text: wrong1, isCorrect: false, id: 1 },
      { text: wrong2, isCorrect: false, id: 2 },
      { text: wrong3, isCorrect: false, id: 3 }
    ];

    questions.push({
      date,
      difficulty,
      question: questionText,
      answers,
      referenceCitation,
      referenceVerse
    });
  }

  return questions;
}

/**
 * Fetch and parse questions from all sheets
 */
async function generateQuestionsJSON() {
  console.log('📥 Fetching questions from Google Sheets...\n');
  
  const allQuestions = {};
  const difficulties = ['easy', 'medium', 'hard', 'impossible'];

  for (const difficulty of difficulties) {
    try {
      console.log(`   Fetching ${difficulty}...`);
      const response = await fetch(SHEET_URLS[difficulty]);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${difficulty}: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const questions = parseAllQuestions(csvText, difficulty);
      
      console.log(`   ✓ Found ${questions.length} ${difficulty} questions`);
      
      // Group by date
      questions.forEach(q => {
        if (!allQuestions[q.date]) {
          allQuestions[q.date] = [];
        }
        allQuestions[q.date].push({
          difficulty: q.difficulty,
          question: q.question,
          answers: q.answers,
          referenceCitation: q.referenceCitation,
          referenceVerse: q.referenceVerse
        });
      });
      
    } catch (error) {
      console.error(`   ✗ Error fetching ${difficulty}:`, error.message);
    }
  }

  // Sort each date's questions by difficulty order
  const difficultyOrder = { easy: 0, medium: 1, hard: 2, impossible: 3 };
  Object.keys(allQuestions).forEach(date => {
    allQuestions[date].sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
  });

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON file
  const outputPath = path.join(outputDir, 'questions.json');
  fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));

  const totalDates = Object.keys(allQuestions).length;
  const totalQuestions = Object.values(allQuestions).reduce((sum, qs) => sum + qs.length, 0);
  
  console.log(`\n✅ Generated questions.json`);
  console.log(`   📅 ${totalDates} dates`);
  console.log(`   📝 ${totalQuestions} total questions`);
  console.log(`   📁 ${outputPath}`);
}

// Run the script
generateQuestionsJSON().catch(error => {
  console.error('\n❌ Error generating questions:', error);
  process.exit(1);
});
