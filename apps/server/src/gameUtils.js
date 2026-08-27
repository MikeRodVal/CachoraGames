
export function generateGrid(words, size = 12) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(""));
  const placedWords = [];

  const directions = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  for (const word of words) {
    const formattedWord = word.toUpperCase();
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 100) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);

      if (canPlace(grid, formattedWord, row, col, dir, size)) {
        place(grid, formattedWord, row, col, dir);
        placedWords.push({ word: formattedWord, row, col, dir });
        placed = true;
      }
      attempts++;
    }
  }

  // Fill remaining
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  return { grid, placedWords: placedWords.map(p => ({ word: p.word })) };
}

function canPlace(grid, word, row, col, dir, size) {
  for (let i = 0; i < word.length; i++) {
    const r = row + i * dir[0];
    const c = col + i * dir[1];
    if (r < 0 || r >= size || c < 0 || c >= size || (grid[r][c] !== "" && grid[r][c] !== word[i])) {
      return false;
    }
  }
  return true;
}

function place(grid, word, row, col, dir) {
  for (let i = 0; i < word.length; i++) {
    grid[row + i * dir[0]][col + i * dir[1]] = word[i];
  }
}
