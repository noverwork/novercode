import { describe, expect, it } from 'vitest';

import {
  CellPos,
  extractBlockText,
  NormalizedRect,
  normalizeRect,
  pixelToCell,
  TermCell,
} from '../canvas-selection-utils';

describe('pixelToCell', () => {
  it('should convert pixel coords to cell coords', () => {
    expect(pixelToCell(0, 0)).toEqual({ col: 0, row: 0 });
  });

  it('should handle coords at cell boundaries', () => {
    // CELL_WIDTH = 9, CELL_HEIGHT = 17
    expect(pixelToCell(9, 17)).toEqual({ col: 1, row: 1 });
    expect(pixelToCell(18, 34)).toEqual({ col: 2, row: 2 });
  });

  it('should floor to nearest cell', () => {
    expect(pixelToCell(4, 8)).toEqual({ col: 0, row: 0 }); // 4/9=0.44, 8/17=0.47
    expect(pixelToCell(13, 25)).toEqual({ col: 1, row: 1 }); // 13/9=1.44, 25/17=1.47
  });

  it('should handle negative coords', () => {
    expect(pixelToCell(-1, -1)).toEqual({ col: -1, row: -1 });
    expect(pixelToCell(-100, -100)).toEqual({ col: -12, row: -6 });
  });
});

describe('normalizeRect', () => {
  it('should normalize when start > end', () => {
    const start: CellPos = { col: 10, row: 10 };
    const end: CellPos = { col: 5, row: 5 };
    const result = normalizeRect(start, end);
    expect(result).toEqual({ startRow: 5, endRow: 10, startCol: 5, endCol: 10 });
  });

  it('should return same values when start < end', () => {
    const start: CellPos = { col: 5, row: 5 };
    const end: CellPos = { col: 10, row: 10 };
    const result = normalizeRect(start, end);
    expect(result).toEqual({ startRow: 5, endRow: 10, startCol: 5, endCol: 10 });
  });

  it('should handle single point selection', () => {
    const start: CellPos = { col: 0, row: 0 };
    const end: CellPos = { col: 0, row: 0 };
    const result = normalizeRect(start, end);
    expect(result).toEqual({ startRow: 0, endRow: 0, startCol: 0, endCol: 0 });
  });

  it('should normalize mixed directions', () => {
    const start: CellPos = { col: 10, row: 5 };
    const end: CellPos = { col: 5, row: 10 };
    const result = normalizeRect(start, end);
    expect(result).toEqual({ startRow: 5, endRow: 10, startCol: 5, endCol: 10 });
  });
});

describe('extractBlockText', () => {
  it('should return empty string for empty cells array', () => {
    const cells: TermCell[][] = [];
    const rect: NormalizedRect = { startRow: 0, endRow: 0, startCol: 0, endCol: 0 };
    expect(extractBlockText(cells, rect)).toBe('');
  });

  it('should extract single cell text', () => {
    const cells: TermCell[][] = [[{ c: 'A', wide: false, spacer: false }]];
    const rect: NormalizedRect = { startRow: 0, endRow: 0, startCol: 0, endCol: 0 };
    expect(extractBlockText(cells, rect)).toBe('A');
  });

  it('should extract 2x2 block', () => {
    const cells: TermCell[][] = [
      [
        { c: 'A', wide: false, spacer: false },
        { c: 'B', wide: false, spacer: false },
      ],
      [
        { c: 'C', wide: false, spacer: false },
        { c: 'D', wide: false, spacer: false },
      ],
    ];
    const rect: NormalizedRect = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 };
    expect(extractBlockText(cells, rect)).toBe('AB\nCD');
  });

  it('should skip spacer cells', () => {
    const cells: TermCell[][] = [
      [{ c: 'A', wide: false, spacer: false }],
      [{ c: ' ', wide: false, spacer: true }], // spacer - should be skipped
      [{ c: 'C', wide: false, spacer: false }],
    ];
    const rect: NormalizedRect = { startRow: 0, endRow: 2, startCol: 0, endCol: 0 };
    // Row 0: 'A', Row 1: '' (spacer skipped), Row 2: 'C'
    expect(extractBlockText(cells, rect)).toBe('A\n\nC');
  });

  it('should handle out of bounds gracefully', () => {
    const cells: TermCell[][] = [[{ c: 'A', wide: false, spacer: false }]];
    const rect: NormalizedRect = { startRow: 0, endRow: 5, startCol: 0, endCol: 5 };
    // Should not throw, just handle gracefully
    expect(extractBlockText(cells, rect)).toBe('A\n\n\n\n\n');
  });
});
