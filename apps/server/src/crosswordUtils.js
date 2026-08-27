import { crosswordData } from "./crosswordData.js";

export function generateCrossword(size = 13) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(null));
  const placedWords = [];

  // Shuffle and select candidate words
  const candidates = crosswordData.sort(() => 0.5 - Math.random());

  // 1. Place the first word in the middle
  const firstWordObj = candidates[0];
  const firstWord = firstWordObj.word;
  const startRow = Math.floor(size / 2);
  const startCol = Math.max(0, Math.floor((size - firstWord.length) / 2));
  
  // Place first word horizontally
  for (let i = 0; i < firstWord.length; i++) {
    grid[startRow][startCol + i] = { char: firstWord[i], revealed: false, number: 1 };
  }
  placedWords.push({
    ...firstWordObj,
    row: startRow,
    col: startCol,
    isHorizontal: true,
    number: 1
  });

  // 2. Try to place remaining words intersecting with already placed words
  let currentNumber = 2;
  for (let k = 1; k < candidates.length; k++) {
    if (placedWords.length >= 10) break; // Limit to 10 words

    const newWordObj = candidates[k];
    const newWord = newWordObj.word;
    let placed = false;

    // Search for intersections with any already placed word
    for (const placedWord of placedWords) {
      if (placed) break;

      for (let i = 0; i < placedWord.word.length; i++) {
        if (placed) break;
        const placedChar = placedWord.word[i];

        for (let j = 0; j < newWord.length; j++) {
          if (newWord[j] === placedChar) {
            // Found a common letter at index i in placedWord and index j in newWord
            const isHorizontal = !placedWord.isHorizontal;
            
            // Calculate starting coordinate of newWord
            let newRow, newCol;
            if (isHorizontal) {
              // placedWord is vertical, newWord is horizontal
              newRow = placedWord.row + i;
              newCol = placedWord.col - j;
            } else {
              // placedWord is horizontal, newWord is vertical
              newRow = placedWord.row - j;
              newCol = placedWord.col + i;
            }

            if (canPlaceTrueCrossword(grid, newWord, newRow, newCol, isHorizontal, size, newRow + (isHorizontal ? 0 : j), newCol + (isHorizontal ? j : 0))) {
              placeTrueCrossword(grid, newWord, newRow, newCol, isHorizontal, currentNumber);
              placedWords.push({
                ...newWordObj,
                row: newRow,
                col: newCol,
                isHorizontal,
                number: currentNumber
              });
              currentNumber++;
              placed = true;
              break;
            }
          }
        }
      }
    }
  }

  return { grid, placedWords };
}

function canPlaceTrueCrossword(grid, word, startRow, startCol, isHorizontal, size, intersectRow, intersectCol) {
  // Check bounds
  if (startRow < 0 || startCol < 0) return false;
  if (isHorizontal && startCol + word.length > size) return false;
  if (!isHorizontal && startRow + word.length > size) return false;

  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? startRow : startRow + i;
    const c = isHorizontal ? startCol + i : startCol;

    const cell = grid[r][c];
    // If there is already a letter, it must match the new word's letter
    if (cell && cell.char !== word[i]) {
      return false;
    }

    // Ensure it doesn't run adjacent/parallel to other words or create invalid touchings
    // (excluding the intersection cell itself)
    if (r !== intersectRow || c !== intersectCol) {
      if (cell) continue; // matches are allowed

      // Check neighbors (perpendicular) to ensure we don't collide/blend with other words
      const neighbors = isHorizontal 
        ? [[-1, 0], [1, 0]] 
        : [[0, -1], [0, 1]];

      for (const [dr, dc] of neighbors) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (grid[nr][nc]) return false; // adjacent block is not empty
        }
      }
    }
  }

  // Check the cells immediately before and after the word to ensure there's no spillover
  const beforeRow = isHorizontal ? startRow : startRow - 1;
  const beforeCol = isHorizontal ? startCol - 1 : startCol;
  if (beforeRow >= 0 && beforeRow < size && beforeCol >= 0 && beforeCol < size) {
    if (grid[beforeRow][beforeCol]) return false;
  }

  const afterRow = isHorizontal ? startRow : startRow + word.length;
  const afterCol = isHorizontal ? startCol + word.length : startCol;
  if (afterRow >= 0 && afterRow < size && afterCol >= 0 && afterCol < size) {
    if (grid[afterRow][afterCol]) return false;
  }

  return true;
}

function placeTrueCrossword(grid, word, row, col, isHorizontal, number) {
  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;
    // Keep existing cell definition if it's already there (to preserve shared intersections)
    if (!grid[r][c]) {
      grid[r][c] = { char: word[i], revealed: false, number };
    }
  }
}
