export const MS_COLS = 9;
export const MS_ROWS = 9;
export const MS_MINES = 10;

export interface MinesweeperCell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export type MinesweeperBoard = MinesweeperCell[][];

export function createBoard(rng: () => number = Math.random): MinesweeperBoard {
  const board: MinesweeperBoard = Array.from({ length: MS_ROWS }, () =>
    Array.from({ length: MS_COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );

  let placed = 0;
  while (placed < MS_MINES) {
    const row = Math.floor(rng() * MS_ROWS);
    const col = Math.floor(rng() * MS_COLS);
    if (!board[row][col].mine) {
      board[row][col].mine = true;
      placed++;
    }
  }

  for (let row = 0; row < MS_ROWS; row++) {
    for (let col = 0; col < MS_COLS; col++) {
      if (board[row][col].mine) continue;
      board[row][col].adjacent = neighbors(row, col).filter(([r, c]) => board[r][c].mine).length;
    }
  }

  return board;
}

function neighbors(row: number, col: number): [number, number][] {
  const result: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < MS_ROWS && c >= 0 && c < MS_COLS) result.push([r, c]);
    }
  }
  return result;
}

export function reveal(
  board: MinesweeperBoard,
  row: number,
  col: number
): { board: MinesweeperBoard; exploded: boolean } {
  const next = board.map((r) => r.map((cell) => ({ ...cell })));
  const stack: [number, number][] = [[row, col]];
  let exploded = false;

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      exploded = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (const [nr, nc] of neighbors(r, c)) stack.push([nr, nc]);
    }
  }

  return { board: next, exploded };
}

export function toggleFlag(board: MinesweeperBoard, row: number, col: number): MinesweeperBoard {
  const next = board.map((r) => r.map((cell) => ({ ...cell })));
  const cell = next[row][col];
  if (!cell.revealed) cell.flagged = !cell.flagged;
  return next;
}

export function checkWin(board: MinesweeperBoard): boolean {
  return board.every((row) => row.every((cell) => cell.mine || cell.revealed));
}
