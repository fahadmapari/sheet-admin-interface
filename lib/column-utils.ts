// A=0, B=1, ..., Z=25, AA=26, ..., BR=69
export function colIndexToLetter(colIndex: number): string {
  if (colIndex < 0) throw new Error('colIndex must be >= 0, received ' + colIndex);
  let letter = '';
  let n = colIndex;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// "A" → 0, "B" → 1, "Z" → 25, "AA" → 26, "BR" → 69
export function colLetterToIndex(letter: string): number {
  const upper = letter.toUpperCase().trim();
  if (!/^[A-Z]{1,2}$/.test(upper)) throw new Error(`Invalid column letter: ${letter}`);
  let result = 0;
  for (let i = 0; i < upper.length; i++) {
    result = result * 26 + (upper.charCodeAt(i) - 64);
  }
  return result - 1;
}
