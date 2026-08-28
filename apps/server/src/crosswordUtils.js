import { crosswordData } from "./crosswordData.js";

export function generateCrossword(size = 13) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const grid = Array(size).fill(null).map(() => Array(size).fill(null));
    const placedWords = [];
    const candidates = crosswordData.sort(() => 0.5 - Math.random());

    // 1. Place first word
    const firstWordObj = candidates[0];
    placeTrueCrossword(grid, firstWordObj.word, Math.floor(size / 2), Math.floor((size - firstWordObj.word.length) / 2), true, 0);

    placedWords.push({ ...firstWordObj, row: Math.floor(size / 2), col: Math.floor((size - firstWordObj.word.length) / 2), isHorizontal: true });

    // 2. Place remaining
    for (let k = 1; k < candidates.length; k++) {
      if (placedWords.length >= 10) break;
      const newWordObj = candidates[k];
      const newWord = newWordObj.word;
      let placed = false; // bandera para salir de TODOS los ciclos en cuanto se coloque

      for (const placedWord of placedWords) {
        if (placed) break;
        for (let i = 0; i < placedWord.word.length; i++) {
          if (placed) break;
          const placedChar = placedWord.word[i];
          for (let j = 0; j < newWord.length; j++) {
            if (newWord[j] === placedChar) {
              const isHorizontal = !placedWord.isHorizontal;
              const newRow = isHorizontal ? placedWord.row + i : placedWord.row - j;
              const newCol = isHorizontal ? placedWord.col - j : placedWord.col + i;

              if (canPlaceTrueCrossword(grid, newWord, newRow, newCol, isHorizontal, size, newRow + (isHorizontal ? 0 : j), newCol + (isHorizontal ? j : 0))) {
                placeTrueCrossword(grid, newWord, newRow, newCol, isHorizontal, 0);
                placedWords.push({ ...newWordObj, row: newRow, col: newCol, isHorizontal });
                placed = true;
                break; // sale del "for j"
              }
            }
          }
        }
      }
    }

    if (placedWords.length >= 6) {
      // 3. Assign standard numbering
      let numbering = 1;
      const finalPlacedWords = placedWords.map(w => ({ ...w, number: 0 }));

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!grid[r][c]) continue;

          let startsHorizontal = false;
          let startsVertical = false;

          if (c === 0 || !grid[r][c - 1]) startsHorizontal = true;
          if (r === 0 || !grid[r - 1][c]) startsVertical = true;

          if (startsHorizontal || startsVertical) {
            finalPlacedWords.forEach(w => {
              if (w.row === r && w.col === c) {
                w.number = numbering;
                grid[r][c].number = numbering;
              }
            });
            numbering++;
          }
        }
      }
      return { grid, placedWords: finalPlacedWords };
    }
  }
  return { grid: [], placedWords: [] };
}

function canPlaceTrueCrossword(grid, word, startRow, startCol, isHorizontal, size, intersectRow, intersectCol) {
  if (startRow < 0 || startCol < 0) return false;
  if (isHorizontal && startCol + word.length > size) return false;
  if (!isHorizontal && startRow + word.length > size) return false;

  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? startRow : startRow + i;
    const c = isHorizontal ? startCol + i : startCol;

    const cell = grid[r][c];
    if (cell && cell.char !== word[i]) {
      return false;
    }

    if (r !== intersectRow || c !== intersectCol) {
      if (cell) continue;

      const neighbors = isHorizontal
        ? [[-1, 0], [1, 0]]
        : [[0, -1], [0, 1]];

      for (const [dr, dc] of neighbors) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (grid[nr][nc]) return false;
        }
      }
    }
  }

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
    if (!grid[r][c]) {
      grid[r][c] = { char: word[i], revealed: false, number };
    }
  }
}