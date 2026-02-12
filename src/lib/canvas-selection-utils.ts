const CELL_WIDTH = 9;
const CELL_HEIGHT = 17;

export interface CellPos {
  col: number;
  row: number;
}

export interface NormalizedRect {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export interface TermCell {
  c: string;
  wide: boolean;
  spacer: boolean;
}

export function pixelToCell(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.floor(x / CELL_WIDTH),
    row: Math.floor(y / CELL_HEIGHT),
  };
}

export function normalizeRect(start: CellPos, end: CellPos): NormalizedRect {
  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col),
  };
}

export function extractBlockText(cells: TermCell[][], rect: NormalizedRect): string {
  const lines: string[] = [];

  for (let row = rect.startRow; row <= rect.endRow; row++) {
    if (row < 0 || row >= cells.length) {
      lines.push('');
      continue;
    }

    const currentRow = cells[row];
    let line = '';

    for (let col = rect.startCol; col <= rect.endCol; col++) {
      if (col < 0 || col >= currentRow.length) {
        continue;
      }

      const cell = currentRow[col];
      if (cell.spacer) {
        continue;
      }

      line += cell.c;
    }

    lines.push(line);
  }

  return lines.join('\n');
}
