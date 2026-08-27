import { crosswordData } from "./crosswordData.js";

export function generateCrossword(size = 10) {
  // Para un MVP, generamos un layout tipo "cruz" simple
  const grid = Array(size).fill(null).map(() => Array(size).fill(null));
  const wordsToPlace = crosswordData.sort(() => 0.5 - Math.random()).slice(0, 5);
  const placedWords = [];

  // Posicionamiento simplificado (horizontal/vertical alternado)
  wordsToPlace.forEach((wordObj, index) => {
    const isHorizontal = index % 2 === 0;
    const row = isHorizontal ? 2 + index : 2;
    const col = isHorizontal ? 2 : 2 + index;

    if (canPlace(grid, wordObj.word, row, col, isHorizontal, size)) {
      place(grid, wordObj.word, row, col, isHorizontal);
      placedWords.push({ 
        ...wordObj, 
        row, col, 
        isHorizontal, 
        number: index + 1 
      });
    }
  });

  return { grid, placedWords };
}

function canPlace(grid, word, row, col, isHorizontal, size) {
  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;
    if (r >= size || c >= size) return false;
  }
  return true;
}

function place(grid, word, row, col, isHorizontal) {
  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;
    grid[r][c] = { char: word[i], revealed: false };
  }
}
