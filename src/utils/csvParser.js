/**
 * Parse CSV text and extract question for a specific date
 * @param {string} csvText - Raw CSV text from Google Sheets
 * @param {string} targetDate - Date in YYYY-MM-DD format
 * @param {string} difficulty - Question difficulty level
 * @returns {Object|null} Parsed question object or null if not found
 */
export function parseSingleQuestionForDate(csvText, targetDate, difficulty) {
  const rows = []
  let quote = false
  let col = 0, row = 0
  
  // Simple CSV Parser - parse row by row and check date immediately
  for (let c = 0; c < csvText.length; c++) {
    let cc = csvText[c], nc = csvText[c + 1]
    rows[row] = rows[row] || []
    rows[row][col] = rows[row][col] || ''

    if (cc == '"' && quote && nc == '"') { rows[row][col] += cc; ++c; continue }
    if (cc == '"') { quote = !quote; continue }
    if (cc == ',' && !quote) { ++col; continue }
    
    // End of row - check if this is the row we're looking for
    if ((cc == '\r' && nc == '\n' && !quote) || (cc == '\n' && !quote) || (cc == '\r' && !quote)) {
      // Skip header row (row 0 if it contains "Date")
      if (row > 0 || (rows[0] && rows[0][0] && !rows[0][0].toLowerCase().includes("date"))) {
        const cols = rows[row]
        if (cols.length >= 6) { // Need at least: date, question, correct, wrong1, wrong2, wrong3
          const date = cols[0].trim()
          
          // Found today's date - extract question and return immediately
          if (date === targetDate) {
            const questionText = cols[1].trim()
            const correct = cols[2].trim()
            const wrong1 = cols[3].trim()
            const wrong2 = cols[4].trim()
            const wrong3 = cols[5].trim()
            
            // Extract reference verse columns (6 and 7)
            const referenceCitation = cols[6] ? cols[6].trim() : ''
            const referenceVerse = cols[7] ? cols[7].trim() : ''

            // Create answers array with permanent IDs
            let answers = [
              { text: correct, isCorrect: true, id: 0 },
              { text: wrong1, isCorrect: false, id: 1 },
              { text: wrong2, isCorrect: false, id: 2 },
              { text: wrong3, isCorrect: false, id: 3 }
            ]

            // Shuffle answers so "Correct" isn't always first
            answers = answers.sort(() => Math.random() - 0.5)

            return {
              difficulty: difficulty,
              question: questionText,
              answers: answers,
              referenceCitation: referenceCitation,
              referenceVerse: referenceVerse
            }
          }
        }
      }
      
      // Move to next row
      ++row
      col = 0
      if (cc == '\r' && nc == '\n') ++c
      continue
    }

    rows[row][col] += cc
  }

  return null // No question found for this date
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Date string
 */
export function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
