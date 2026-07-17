# Rail Wordmark + Piece Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nav rail's IBM Plex Mono wordmark with a stacked Unbounded mark (JOHN over NG) whose J and O reveal themselves as real tetrominoes, and give the Home hero nameplate the same reveal in place of its current flash.

**Architecture:** A new pure module `src/lib/nameplate.ts` owns the piece model — each piece's cells in its own square SRS-style rotation box, a clockwise rotation function, and the mapping that anchors a piece into the letter's shared 3x3 lattice. A new `PieceMark.astro` component renders the mark (stacked or inline) from that module at build time and wires the reveal for every instance on the page from a single script, so the rail mark, the mobile mark, and the hero nameplate are one implementation rather than three copies. Ownership — which mark performs on a given page — is a `data-owns` flag set from the route, not branching logic in each component.

**Tech Stack:** Astro, TypeScript strict, Vitest (unit), Playwright + axe-core (e2e). No new dependencies.

## Global Constraints

- **One animated JOHN NG per page.** On `/` the hero nameplate reveals and the rail does not. On every other route the rail is the only name on screen and reveals. Enforced by `data-owns`, checked by the reveal script before it plays.
- **The hero's flash is retired**, not kept alongside the reveal. `index.astro`'s `flashNameplate()` script, its `.flashing` rules, and its `.nameplate .ch:not(.sp)::before` overlay are deleted.
- **Only J and O carry piece hues and pieces.** They are the only letters in "JOHN NG" that name real tetrominoes (I/O/T/S/Z/J/L). H/N/N/G stay neutral. This rule already ships — do not widen it.
- **The turn is a snap, never a tween.** A tetromino only ever occupies 0/90/180/270. Rotation is applied by rewriting the blocks' CSS grid placement, which is not a transitionable property — so the turn cannot accidentally become smooth. Do not add a `transform: rotate()` transition or a `steps()` rotation: `steps(3)` puts the piece at 30° and 60°, angles no tetromino occupies.
- **The O does not rotate, and this is not a special case.** Its 2x2 cells in a 2x2 box map onto themselves under `rotateCw`. The no-op must fall out of the math. Do not add an `if (piece === 'O') return` branch.
- **Every piece draws on the same block size, resting on one floor.** Each letter cell is a `LATTICE_SIZE`-block square lattice, bottom-aligned to the cell; a piece's box is anchored to that lattice's bottom-left. This is what "aligned with the actual word" means — the J's blocks and the O's blocks are the same size and sit on the same line.
- **Rail width caps at 12rem**, keeping its fluid floor: `clamp(9rem, 2.9rem + 12.68vw, 12rem)`. It stays a single source of truth in `global.css` read by both `#main-content`'s `margin-left` and `.rail`'s `width`. Do not duplicate the formula.
- **Reduced motion means no reveal at all** — the script checks once and returns; the mark renders at rest with its letters visible.
- **Accessible name stays the literal visible text.** The stacked mark needs a real space character between JOHN and NG or the name concatenates to "JOHNNG" — the same bug this repo already fixed once on the hero nameplate. Do not paper over it with an `aria-label` duplicate.
- Existing hard constraints in CLAUDE.md still apply (no resume link, no email/phone as text, no About page).

---

### Task 1: The piece model

**Files:**
- Create: `src/lib/nameplate.ts`
- Test: `src/lib/nameplate.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PieceLetter`, `Block`, `Piece`, `LATTICE_SIZE`, `PIECES`, `pieceForLetter(letter: string): PieceLetter | null`, `rotateCw(blocks: readonly Block[], boxSize: number): Block[]`, `latticeBlocks(piece: Piece, rotated?: boolean): Block[]`, `NAMEPLATE_LINES`. Tasks 2 and 5 import from here.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/nameplate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  LATTICE_SIZE,
  NAMEPLATE_LINES,
  PIECES,
  latticeBlocks,
  pieceForLetter,
  rotateCw,
  type Block,
} from './nameplate';

/** Blocks are a set, not a sequence — compare them order-independently. */
function sorted(blocks: readonly Block[]): Block[] {
  return [...blocks].sort((a, b) => a.row - b.row || a.col - b.col);
}

describe('pieceForLetter', () => {
  it('maps the two letters of "JOHN NG" that name real tetrominoes', () => {
    expect(pieceForLetter('J')).toBe('J');
    expect(pieceForLetter('O')).toBe('O');
  });

  it('is case-insensitive', () => {
    expect(pieceForLetter('j')).toBe('J');
  });

  it('returns null for letters that name no piece', () => {
    // H/N/G are not tetromino letters (I/O/T/S/Z/J/L), so they stay neutral.
    expect(pieceForLetter('H')).toBeNull();
    expect(pieceForLetter('N')).toBeNull();
    expect(pieceForLetter('G')).toBeNull();
    expect(pieceForLetter(' ')).toBeNull();
  });
});

describe('PIECES', () => {
  it('gives every piece exactly four blocks', () => {
    expect(PIECES.J.blocks).toHaveLength(4);
    expect(PIECES.O.blocks).toHaveLength(4);
  });

  it('rests each piece on the floor of its own box, left-aligned', () => {
    for (const piece of [PIECES.J, PIECES.O]) {
      const maxRow = Math.max(...piece.blocks.map((b) => b.row));
      const minCol = Math.min(...piece.blocks.map((b) => b.col));
      expect(maxRow).toBe(piece.boxSize);
      expect(minCol).toBe(1);
    }
  });

  it('gives J a 3-wide box and O a 2-wide box', () => {
    // Not cosmetic: the box size is what makes rotation well-defined, and
    // it's why the O draws smaller than the J on the same block grid.
    expect(PIECES.J.boxSize).toBe(3);
    expect(PIECES.O.boxSize).toBe(2);
  });
});

describe('rotateCw', () => {
  it('turns J\'s spawn state into its next SRS state', () => {
    // spawn        turned
    //  . . .        X X .
    //  X . .   ->   X . .
    //  X X X        X . .
    expect(sorted(rotateCw(PIECES.J.blocks, PIECES.J.boxSize))).toEqual(
      sorted([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 3, col: 1 },
      ])
    );
  });

  it('leaves the O exactly where it was', () => {
    // The one tetromino a rotation does nothing to. This must fall out of the
    // math — a 2x2 square in a 2x2 box maps onto itself — not out of a
    // special case in the caller.
    expect(sorted(rotateCw(PIECES.O.blocks, PIECES.O.boxSize))).toEqual(
      sorted(PIECES.O.blocks)
    );
  });

  it('keeps a turned piece resting on its box floor', () => {
    const turned = rotateCw(PIECES.J.blocks, PIECES.J.boxSize);
    expect(Math.max(...turned.map((b) => b.row))).toBe(PIECES.J.boxSize);
  });

  it('never loses or duplicates a block', () => {
    const turned = rotateCw(PIECES.J.blocks, PIECES.J.boxSize);
    const unique = new Set(turned.map((b) => `${b.row},${b.col}`));
    expect(unique.size).toBe(4);
  });

  it('returns to the spawn state after four turns', () => {
    let blocks = [...PIECES.J.blocks];
    for (let i = 0; i < 4; i++) blocks = rotateCw(blocks, PIECES.J.boxSize);
    expect(sorted(blocks)).toEqual(sorted(PIECES.J.blocks));
  });
});

describe('latticeBlocks', () => {
  it('leaves J alone — its box already fills the lattice', () => {
    expect(sorted(latticeBlocks(PIECES.J))).toEqual(sorted(PIECES.J.blocks));
  });

  it('drops O onto the lattice floor rather than leaving it at the top', () => {
    // O's box is 2 tall inside a 3-tall lattice, so it has to be pushed down a
    // row — otherwise it would hang in the air while the J rests on the floor.
    expect(sorted(latticeBlocks(PIECES.O))).toEqual(
      sorted([
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
      ])
    );
  });

  it('rests every piece on the same lattice floor, turned or not', () => {
    const cases = [
      latticeBlocks(PIECES.J),
      latticeBlocks(PIECES.J, true),
      latticeBlocks(PIECES.O),
      latticeBlocks(PIECES.O, true),
    ];
    for (const blocks of cases) {
      expect(Math.max(...blocks.map((b) => b.row))).toBe(LATTICE_SIZE);
      expect(Math.min(...blocks.map((b) => b.col))).toBe(1);
    }
  });

  it('keeps every block inside the lattice', () => {
    for (const rotated of [false, true]) {
      for (const piece of [PIECES.J, PIECES.O]) {
        for (const b of latticeBlocks(piece, rotated)) {
          expect(b.row).toBeGreaterThanOrEqual(1);
          expect(b.col).toBeGreaterThanOrEqual(1);
          expect(b.row).toBeLessThanOrEqual(LATTICE_SIZE);
          expect(b.col).toBeLessThanOrEqual(LATTICE_SIZE);
        }
      }
    }
  });

  it('does not mutate the piece it was given', () => {
    const before = JSON.stringify(PIECES.J.blocks);
    latticeBlocks(PIECES.J, true);
    expect(JSON.stringify(PIECES.J.blocks)).toBe(before);
  });
});

describe('constants', () => {
  it('pins LATTICE_SIZE at 3', () => {
    // PieceMark.astro's CSS hardcodes `repeat(3, 1fr)` for the lattice grid,
    // because repeat() needs an integer literal and can't read a custom
    // property reliably. If this number changes, that CSS must change with it.
    expect(LATTICE_SIZE).toBe(3);
  });

  it('splits the name where the mark stacks it', () => {
    expect(NAMEPLATE_LINES).toEqual(['JOHN', 'NG']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/nameplate.test.ts`
Expected: FAIL — `Failed to resolve import "./nameplate"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/nameplate.ts`:

```ts
/**
 * The piece model behind the JOHN NG mark's reveal.
 *
 * "JOHN NG" contains exactly two letters that also name real tetrominoes
 * (the seven are I/O/T/S/Z/J/L): J and O. Those two are the only letters that
 * carry a piece hue anywhere on this site, and the only ones that can turn
 * into a piece. H/N/N/G name nothing and stay neutral.
 */

export type PieceLetter = 'J' | 'O';

/** A single cell, 1-indexed, in whatever grid the surrounding code is using. */
export interface Block {
  row: number;
  col: number;
}

export interface Piece {
  /**
   * Width and height of the piece's own square rotation box, in blocks.
   * Rotation is only well-defined inside a square box, which is why each
   * piece carries one instead of being rotated inside the shared lattice.
   */
  boxSize: number;
  /** The piece's cells in box coordinates, resting on the box's floor. */
  blocks: readonly Block[];
}

/**
 * Every letter cell is a square lattice this many blocks on a side. One
 * lattice per letter, sharing a block size and a floor across the whole word,
 * so a piece in one letter lines up with a piece in another.
 *
 * PieceMark.astro's CSS hardcodes `repeat(3, 1fr)` to match: CSS `repeat()`
 * needs an integer literal and can't reliably read a custom property. A test
 * pins this value so the two can't drift apart silently.
 */
export const LATTICE_SIZE = 3;

export const PIECES: Readonly<Record<PieceLetter, Piece>> = {
  // J spawns flat, long edge down, resting on its box floor:
  //   . . .
  //   X . .
  //   X X X
  J: {
    boxSize: 3,
    blocks: [
      { row: 2, col: 1 },
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 },
    ],
  },
  // O is a 2x2 square in a 2x2 box:
  //   X X
  //   X X
  O: {
    boxSize: 2,
    blocks: [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  },
};

export function pieceForLetter(letter: string): PieceLetter | null {
  const upper = letter.toUpperCase();
  return upper === 'J' || upper === 'O' ? upper : null;
}

/**
 * Rotate blocks 90° clockwise inside their own square box:
 * `(row, col) -> (col, boxSize + 1 - row)`.
 *
 * The O's no-op falls straight out of this — a 2x2 square in a 2x2 box maps
 * onto itself — which is why there is no special case for it here or in any
 * caller. That is the real Tetris rule, not a gap in the implementation.
 */
export function rotateCw(blocks: readonly Block[], boxSize: number): Block[] {
  return blocks.map(({ row, col }) => ({ row: col, col: boxSize + 1 - row }));
}

/**
 * Place a piece's blocks into a letter's shared lattice, with the piece's box
 * anchored to the lattice's bottom-left. Every piece therefore rests on the
 * same floor and starts at the same left edge, at the same block size — the
 * J simply occupies more of its lattice than the O does.
 */
export function latticeBlocks(piece: Piece, rotated = false): Block[] {
  const blocks = rotated
    ? rotateCw(piece.blocks, piece.boxSize)
    : piece.blocks.map((b) => ({ ...b }));
  const rowOffset = LATTICE_SIZE - piece.boxSize;
  return blocks.map(({ row, col }) => ({ row: row + rowOffset, col }));
}

/** The mark's two lines: the rail and the mobile bar stack them, the hero
 *  sets them on one line. */
export const NAMEPLATE_LINES: readonly [string, string] = ['JOHN', 'NG'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/nameplate.test.ts`
Expected: PASS — 18 tests.

- [ ] **Step 5: Run the whole unit suite for regressions**

Run: `npm test`
Expected: PASS — previously 74 tests, now 92.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nameplate.ts src/lib/nameplate.test.ts
git commit -m "feat: add nameplate piece model with SRS-box rotation"
```

---

### Task 2: The PieceMark component

**Files:**
- Create: `src/components/PieceMark.astro`

**Interfaces:**
- Consumes: `NAMEPLATE_LINES`, `PIECES`, `pieceForLetter`, `latticeBlocks` from `src/lib/nameplate.ts` (Task 1).
- Produces: a component with props `{ layout: 'stack' | 'inline'; reveals?: boolean; trigger?: 'hover' | 'load'; class?: string }`. Renders a root `<span class="piece-mark" data-piece-mark data-owns data-trigger>`. Tasks 4 and 5 mount it. The reveal script wires **every** `[data-piece-mark]` on the page, so mounting the component more than once needs no extra wiring.

**Context you need:** Astro scopes `<style>` blocks by rewriting selectors against a `data-astro-cid-*` attribute stamped on elements at build time. Everything this component styles is rendered by Astro (not `document.createElement`), so it gets that attribute and plain scoped selectors work — no `:global()` needed here, unlike `TetrisHero.astro`.

- [ ] **Step 1: Create the component**

Create `src/components/PieceMark.astro`:

```astro
---
import {
  NAMEPLATE_LINES,
  PIECES,
  latticeBlocks,
  pieceForLetter,
} from '../lib/nameplate';

interface Props {
  /** 'stack' = JOHN over NG (the rail, the mobile bar). 'inline' = one line
   *  (the Home hero). */
  layout: 'stack' | 'inline';
  /** Whether this mark performs the reveal on this page. Exactly one mark per
   *  page should be true — see the ownership rule in CLAUDE.md. */
  reveals?: boolean;
  /** 'hover' = plays on pointer/focus. 'load' = plays once on load, and again
   *  on click. */
  trigger?: 'hover' | 'load';
  class?: string;
}

const { layout, reveals = false, trigger = 'hover', class: className } = Astro.props;

const [first, second] = NAMEPLATE_LINES;
const lines = layout === 'stack' ? [first, second] : [`${first} ${second}`];
---
<span
  class:list={['piece-mark', `layout-${layout}`, className]}
  data-piece-mark
  data-owns={String(reveals)}
  data-trigger={trigger}
>
  {lines.map((line, lineIndex) => (
    <Fragment>
      {/* The stacked mark's two lines are separate elements, so without a real
          space character between them the accessible name concatenates to
          "JOHNNG". Same bug this repo already fixed once on the hero
          nameplate — fix it with a space, not an aria-label duplicate. */}
      {lineIndex > 0 && <span class="sr-only">&nbsp;</span>}
      <span class="line">
        {[...line].map((letter) => {
          const key = pieceForLetter(letter);
          return (
            <span class:list={['ch', letter === ' ' && 'sp']} data-piece={key ?? undefined}>
              {key && (
                <span class="lattice" aria-hidden="true">
                  {latticeBlocks(PIECES[key]).map((block) => (
                    <b style={`grid-row:${block.row};grid-column:${block.col}`}></b>
                  ))}
                </span>
              )}
              <span class="glyph" set:html={letter === ' ' ? '&nbsp;' : letter}></span>
            </span>
          );
        })}
      </span>
    </Fragment>
  ))}
</span>

<style>
  .piece-mark {
    font-family: 'Unbounded', sans-serif;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    display: flex;
    flex-direction: column;
    gap: var(--mark-line-gap, 2px);
    /* The well's ceiling. Nothing here leaves the box today, but the mark is a
       Tetris object and a piece above the top edge is out of play. */
    overflow: hidden;
  }
  .layout-inline {
    flex-direction: row;
    letter-spacing: -0.01em;
  }
  .line {
    display: flex;
    gap: var(--mark-cell-gap, 3px);
  }

  .ch {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.05em;
    height: 1.16em;
    color: var(--cell, var(--color-text));
  }
  .ch.sp {
    min-width: 0.4em;
  }
  /* Only J and O — the only letters in "JOHN NG" that are also tetromino
     letters (I/O/T/S/Z/J/L). Tokens live in tokens.css so the mark and the
     ambient board read the literal same values. */
  .ch[data-piece='J'] { --cell: var(--tetris-j); }
  .ch[data-piece='O'] { --cell: var(--tetris-o); }

  /* The lattice IS the letter cell: full letter width, square, bottom-aligned.
     That's what makes the pieces line up with the word — every piece in every
     letter shares one block size and one floor. `repeat(3, ...)` is
     LATTICE_SIZE from src/lib/nameplate.ts, hardcoded because CSS repeat()
     needs an integer literal; a unit test pins the two together. */
  .lattice {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    aspect-ratio: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .lattice b {
    background: var(--cell);
    opacity: 0;
    transition: opacity 90ms steps(1, end);
  }
  /* Blocks land one at a time rather than all at once — the piece assembling
     itself. Delays key off DOM order, which the script never reorders: it
     rewrites each block's grid placement in place. */
  .lattice b:nth-child(1) { transition-delay: 0ms; }
  .lattice b:nth-child(2) { transition-delay: 45ms; }
  .lattice b:nth-child(3) { transition-delay: 90ms; }
  .lattice b:nth-child(4) { transition-delay: 135ms; }

  .glyph {
    position: relative;
    z-index: 1;
  }
  .ch[data-piece] .glyph {
    transition: color 120ms steps(2, end);
  }

  .revealing .lattice { opacity: 1; }
  .revealing .lattice b { opacity: 1; }
  .revealing .ch[data-piece] .glyph { color: var(--color-bg); }

  @media (prefers-reduced-motion: reduce) {
    .lattice b,
    .ch[data-piece] .glyph {
      transition: none;
    }
  }
</style>

<script>
  import { PIECES, latticeBlocks, pieceForLetter } from '../lib/nameplate';

  // Four blocks staggered 45ms apart, each snapping in over 90ms.
  const FILL_MS = 225;
  // A beat on the spawn state before the turn, and another on the turned state
  // after it — a snap with no dwell on either side reads as a glitch.
  const BEFORE_TURN_MS = 140;
  const AFTER_TURN_MS = 220;
  const BACK_MS = 220;

  const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  /**
   * Apply a rotation state by rewriting each block's grid placement.
   *
   * This is the whole reason the turn is blocky: grid-row/grid-column are not
   * transitionable, so the piece jumps between rotation states in one frame
   * and can never be caught at an angle no tetromino occupies. It also avoids
   * the trap this repo already hit with the ambient piece — SHAPES defines
   * each rotation as an independently authored array, so interpolating
   * between two of them sends every cell down its own unrelated diagonal.
   *
   * The positions come from the same latticeBlocks() the markup was rendered
   * from, so there is no second formula to drift out of sync with the first.
   */
  function applyRotation(mark: HTMLElement, rotated: boolean): void {
    mark.querySelectorAll<HTMLElement>('.ch[data-piece]').forEach((ch) => {
      const key = pieceForLetter(ch.dataset.piece ?? '');
      if (!key) return;
      const blocks = latticeBlocks(PIECES[key], rotated);
      const cells = ch.querySelectorAll<HTMLElement>('.lattice b');
      blocks.forEach((block, i) => {
        const cell = cells[i];
        if (!cell) return;
        cell.style.gridRow = String(block.row);
        cell.style.gridColumn = String(block.col);
      });
    });
  }

  // Same convention as the Tetris ambient loop: check reduced motion once, and
  // if it's set, never attach. The mark renders at rest with no script.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const marks = Array.from(document.querySelectorAll<HTMLElement>('[data-piece-mark]'));

    for (const mark of marks) {
      let playing = false;

      const play = async (): Promise<void> => {
        // Ownership: exactly one mark per page performs. The flag is set from
        // the route at build time; this is the only place it's read.
        if (playing || mark.dataset.owns !== 'true') return;
        playing = true;

        mark.classList.add('revealing');
        await wait(FILL_MS + BEFORE_TURN_MS);
        applyRotation(mark, true);
        mark.dataset.turned = 'true';
        await wait(AFTER_TURN_MS);
        mark.classList.remove('revealing');
        await wait(BACK_MS);
        // Reset the rotation only once the blocks are invisible, so the turn
        // never plays backwards on screen.
        applyRotation(mark, false);
        delete mark.dataset.turned;
        // Lets an e2e test prove two reads landed on the same play, the same
        // way TetrisHero.astro's data-cycle does for the ambient loop.
        mark.dataset.cycle = String(Number(mark.dataset.cycle ?? '0') + 1);
        playing = false;
      };

      const host = mark.closest('a, button') ?? mark;

      if (mark.dataset.trigger === 'load') {
        void play();
        host.addEventListener('click', () => void play());
      } else {
        host.addEventListener('mouseenter', () => void play());
        host.addEventListener('focus', () => void play());
      }
    }
  }
</script>
```

- [ ] **Step 2: Verify it type-checks and builds**

Run: `npm run build`
Expected: PASS. The component isn't mounted yet, so nothing renders it — this only proves it compiles.

- [ ] **Step 3: Commit**

```bash
git add src/components/PieceMark.astro
git commit -m "feat: add PieceMark component with snap-rotation piece reveal"
```

---

### Task 3: Cap the rail at 12rem

**Files:**
- Modify: `src/styles/global.css:88-101`
- Test: `tests/e2e/nav.spec.ts:3-31`

**Interfaces:**
- Consumes: nothing.
- Produces: `--rail-width` capped at 12rem. Task 4's `.rail` reads it unchanged.

**Context you need:** `--rail-width` is deliberately one declaration read by two consumers — `#main-content`'s `margin-left` and `.rail`'s `width`. Narrowing the cap moves every page's content left by 2rem. Do not add a second formula anywhere.

- [ ] **Step 1: Update the failing tests first**

In `tests/e2e/nav.spec.ts`, replace the first two tests (lines 3–31) with:

```ts
test('desktop: rail renders fully expanded with both links reachable and labeled', async ({ page }) => {
  // 1440px is past the rail's own ~1149px full-width threshold (--rail-width
  // in global.css), so it's pinned at its 12rem max here rather than the
  // narrower clamped width a viewport below that threshold would produce.
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');

  const rail = page.locator('#nav-rail');
  await expect(rail).toHaveCSS('width', '192px'); // 12rem at the 16px root font size

  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
});

test('desktop: rail narrows toward its floor on a narrower desktop window', async ({ page }) => {
  // Below the rail's ~1149px full-width threshold, --rail-width clamps between
  // a 9rem floor and 12rem — at 900px it should be narrower than 12rem but no
  // narrower than the 9rem (144px) floor, and still above the 769px
  // breakpoint where the rail disappears entirely for the mobile nav.
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/');

  const rail = page.locator('#nav-rail');
  const width = await rail.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThan(192);
  expect(width).toBeGreaterThanOrEqual(144);

  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test tests/e2e/nav.spec.ts -g "fully expanded"`
Expected: FAIL — `Expected string: "192px"` / `Received string: "224px"`.

- [ ] **Step 3: Make the change**

In `src/styles/global.css`, replace the `@media (min-width: 769px)` block's comment and value:

```css
@media (min-width: 769px) {
  /* Single source of truth for the desktop rail's width, read by both
     #main-content's margin-left here and .rail's own width in Nav.astro —
     duplicating this formula in both places invites the two to drift apart,
     the same failure shape this codebase has already hit once with the
     Tetris ambient piece's animated vs. committed placement (see CLAUDE.md).
     Scales from a 9rem floor at the 769px breakpoint up to a 12rem cap by the
     time the viewport reaches ~1149px, holding 12rem beyond that. */
  :root {
    --rail-width: clamp(9rem, 2.9rem + 12.68vw, 12rem);
  }
  #main-content {
    margin-left: var(--rail-width);
  }
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx playwright test tests/e2e/nav.spec.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css tests/e2e/nav.spec.ts
git commit -m "feat: cap desktop rail width at 12rem"
```

---

### Task 4: Mount the stacked mark in both navs

**Files:**
- Modify: `src/components/Nav.astro`
- Modify: `src/components/MobileNav.astro`
- Modify: `src/styles/global.css:34`

**Interfaces:**
- Consumes: `PieceMark` (Task 2), `--rail-width` (Task 3).
- Produces: `.rail-wordmark` and `.mobile-wordmark` as `PieceMark` instances. Task 5's ownership rule depends on `Nav.astro` computing `isHome`.

**Context you need:** `global.css:34` currently reads `.eyebrow, .meta, .wordmark { font-family: 'IBM Plex Mono', monospace; }`. The `.wordmark` class is what makes the mark look outdated; once both navs use `PieceMark` nothing references it, so it goes. `.eyebrow` and `.meta` keep the rule.

- [ ] **Step 1: Update `Nav.astro`**

Replace the frontmatter and the `.rail-home` link:

```astro
---
import ThemeToggle from './ThemeToggle.astro';
import PieceMark from './PieceMark.astro';

// The ownership rule: exactly one JOHN NG performs the reveal per page. On
// Home the hero nameplate IS the name, so the rail stays quiet rather than
// saying it twice; on every other route the rail is the only name on screen
// and takes the reveal.
const isHome = Astro.url.pathname === '/';
---
<nav class="rail" id="nav-rail" aria-label="Primary">
  <a href="/" class="rail-home" aria-label="John Ng — Home">
    <PieceMark layout="stack" reveals={!isHome} trigger="hover" class="rail-wordmark" />
  </a>
```

Leave `.rail-links` and `.rail-footer` exactly as they are.

In the same file's `<style>`, replace the `.rail-home` rule:

```css
  .rail-home {
    display: flex;
    align-items: center;
    padding: 0 var(--space-4);
    text-decoration: none;
    color: var(--color-text);
  }
  .rail-wordmark {
    font-size: 1.25rem;
  }
```

(The old rule's `letter-spacing: 0.05em` goes: it was tuning IBM Plex Mono, and `PieceMark` sets its own tracking.)

- [ ] **Step 2: Update `MobileNav.astro`**

Replace the import block and the wordmark link:

```astro
---
import ThemeToggle from './ThemeToggle.astro';
import PieceMark from './PieceMark.astro';
---
<div class="mobile-nav">
  <nav class="mobile-bar" aria-label="Primary">
    <a href="/" class="mobile-home">
      <PieceMark layout="stack" reveals={false} trigger="hover" class="mobile-wordmark" />
    </a>
```

In the same file's `<style>`, replace the `.mobile-wordmark` rule:

```css
  .mobile-home {
    text-decoration: none;
    color: var(--color-text);
    display: flex;
  }
  .mobile-wordmark {
    font-size: 1.05rem;
  }
```

The mobile mark never reveals: options that fire on hover don't exist on a touch screen, and a tap on the wordmark is a navigation to Home — the animation would play while the page is already leaving. Its accessible name comes from its own letters plus the `sr-only` space `PieceMark` renders between the lines.

- [ ] **Step 3: Drop the dead `.wordmark` rule**

In `src/styles/global.css` line 34, replace:

```css
.eyebrow, .meta, .wordmark { font-family: 'IBM Plex Mono', monospace; }
```

with:

```css
.eyebrow, .meta { font-family: 'IBM Plex Mono', monospace; }
```

- [ ] **Step 4: Verify nothing still references `.wordmark`**

Run: `grep -rn "wordmark" src/ tests/`
Expected: hits only for `.rail-wordmark` and `.mobile-wordmark` (the `PieceMark` class props and their rules), plus `nav.spec.ts`'s `.rail-home` click test. No bare `class="wordmark"` anywhere.

- [ ] **Step 5: Build and run the nav suite**

Run: `npm run build && npx playwright test tests/e2e/nav.spec.ts`
Expected: PASS — 4 tests. The `wordmark links home` test still passes: `.rail-home` is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nav.astro src/components/MobileNav.astro src/styles/global.css
git commit -m "feat: stack the JOHN NG mark in both navs"
```

---

### Task 5: Give the hero the reveal, retire its flash

**Files:**
- Modify: `src/pages/index.astro:23-25` (markup), `:102-156` (styles), `:308-343` (script)

**Interfaces:**
- Consumes: `PieceMark` (Task 2).
- Produces: `#nameplate` containing a `PieceMark` with `reveals` true and `trigger="load"`. No other task depends on this.

**Context you need:** the hero nameplate currently flashes on load and on click via `flashNameplate()`, borrowing `TetrisHero.astro`'s `flashRows()` cadence. The reveal replaces it outright. Keeping both would put two animations on one element — the same redundancy the ownership rule exists to prevent, just relocated. `.nameplate` stays a real `<button>`; only its contents and its motion change.

- [ ] **Step 1: Import the component**

In `src/pages/index.astro`'s frontmatter, add to the existing imports:

```ts
import PieceMark from '../components/PieceMark.astro';
```

- [ ] **Step 2: Replace the nameplate's markup**

Replace lines 23–25:

```astro
      <button class="nameplate" id="nameplate" type="button" data-reveal>
        <span class="ch j-piece">J</span><span class="ch o-piece">O</span><span class="ch">H</span><span class="ch">N</span><span class="ch sp">&nbsp;</span><span class="ch">N</span><span class="ch">G</span>
      </button>
```

with:

```astro
      <button class="nameplate" id="nameplate" type="button" data-reveal>
        <PieceMark layout="inline" reveals={true} trigger="load" />
      </button>
```

- [ ] **Step 3: Replace the nameplate's styles**

In the same file's `<style>`, replace the whole run of nameplate rules (`.nameplate` through `.nameplate .ch.flashing::before`, lines 102–156) with just:

```css
  .nameplate {
    font-size: clamp(1.7rem, 3.6vw, 2.4rem);
    display: inline-flex;
    margin: 0 0 var(--space-3);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
  }
  .nameplate:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 6px;
    border-radius: 4px;
  }
```

Everything else those rules did now lives in `PieceMark.astro`: the Unbounded face and weight, the per-cell layout, the J/O hues. The flash overlay (`.nameplate .ch:not(.sp)::before`) and `.flashing` are deleted with no replacement.

- [ ] **Step 4: Delete the flash script**

Delete the entire first `<script>` block (lines 308–343) — the one opening with the comment `// Kept in sync with TetrisHero.astro's own flashRows() constants/pattern`, through its closing `</script>`. Leave the second `<script>` (the reveal/parallax one starting `const REVEAL_STAGGER_MS = 110;`) untouched.

- [ ] **Step 5: Verify the flash is gone**

Run: `grep -n "flash\|j-piece\|o-piece" src/pages/index.astro`
Expected: no output. (`--tetris-j`/`--tetris-o` still live in `tokens.css` and are now read by `PieceMark.astro`.)

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: replace hero nameplate flash with the piece reveal"
```

---

### Task 6: End-to-end coverage

**Files:**
- Create: `tests/e2e/wordmark.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing.

**Context you need — read this before writing the axe change.** This repo has already hit the exact conflict you're about to re-create. `axe-core`'s `color-contrast` rule alpha-blends a foreground into its background and scores the blend. During the reveal, `.glyph`'s color is deliberately set to `var(--color-bg)` — the letter knocked out so the piece shows through. An axe scan that lands mid-reveal sees text the same color as its background and reports a real WCAG failure. The ruling from the last time this happened (see CLAUDE.md) was: scan the page in its resting state, keep `color-contrast` at full strength, add zero exclusions. Do the same here — wait for no mark to be mid-reveal, don't disable the rule.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/wordmark.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('ownership: exactly one JOHN NG performs per page', () => {
  test('home: the hero owns the reveal and the rail stays quiet', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    await expect(page.locator('#nameplate [data-piece-mark]')).toHaveAttribute('data-owns', 'true');
    await expect(page.locator('.rail-wordmark')).toHaveAttribute('data-owns', 'false');
  });

  test('projects: the rail is the only name, so it owns the reveal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/projects');

    await expect(page.locator('.rail-wordmark')).toHaveAttribute('data-owns', 'true');
    await expect(page.locator('#nameplate')).toHaveCount(0);
  });

  test('a rail mark that does not own the reveal never plays', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const rail = page.locator('.rail-wordmark');
    await rail.hover();
    // Long enough for a full play (225 + 140 + 220 + 220) to have finished if
    // the ownership gate were broken.
    await page.waitForTimeout(1000);
    await expect(rail).not.toHaveClass(/revealing/);
    await expect(rail).not.toHaveAttribute('data-turned', 'true');
  });
});

test.describe('the mark itself', () => {
  test('the rail mark stacks JOHN over NG', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/projects');

    const lines = page.locator('.rail-wordmark .line');
    await expect(lines).toHaveCount(2);

    const boxes = await lines.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().top)
    );
    // Stacked, not side by side: the second line starts below the first.
    expect(boxes[1]).toBeGreaterThan(boxes[0]);
  });

  test('only J and O carry pieces', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/projects');

    const pieces = await page.locator('.rail-wordmark .ch[data-piece]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-piece'))
    );
    // "JOHN NG" — H, N, N and G name no tetromino, so they carry nothing.
    expect(pieces).toEqual(['J', 'O']);
  });

  test('the mobile bar keeps its accessible name a real "JOHN NG"', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');

    // Without the sr-only space PieceMark renders between the stacked lines,
    // this name would concatenate to "JOHNNG".
    await expect(page.getByRole('link', { name: 'JOHN NG', exact: true })).toBeVisible();
  });
});

test.describe('the turn', () => {
  test('the J snaps between rotation states and returns to spawn', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const jBlocks = page.locator('#nameplate .ch[data-piece="J"] .lattice b');
    const mark = page.locator('#nameplate [data-piece-mark]');

    // Replay on demand rather than racing the load-triggered play.
    await page.locator('#nameplate').click();

    // Turned state: J's spawn (2,1)(3,1)(3,2)(3,3) rotates to
    // (1,2)(1,1)(2,1)(3,1) — see rotateCw in src/lib/nameplate.ts. The blocks
    // keep their DOM order, so block 0 lands at row 1, col 2.
    await expect(mark).toHaveAttribute('data-turned', 'true');
    const turned = await jBlocks.evaluateAll((els) =>
      els.map((el) => [el.style.gridRow, el.style.gridColumn])
    );
    expect(turned).toEqual([
      ['1', '2'],
      ['1', '1'],
      ['2', '1'],
      ['3', '1'],
    ]);

    // ...then back to spawn once the reveal finishes.
    await expect(mark).not.toHaveAttribute('data-turned', 'true');
    const spawn = await jBlocks.evaluateAll((els) =>
      els.map((el) => [el.style.gridRow, el.style.gridColumn])
    );
    expect(spawn).toEqual([
      ['2', '1'],
      ['3', '1'],
      ['3', '2'],
      ['3', '3'],
    ]);
  });

  test('the O holds still — a rotation does nothing to it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const oBlocks = page.locator('#nameplate .ch[data-piece="O"] .lattice b');
    const mark = page.locator('#nameplate [data-piece-mark]');

    await page.locator('#nameplate').click();
    await expect(mark).toHaveAttribute('data-turned', 'true');

    const turned = await oBlocks.evaluateAll((els) =>
      els.map((el) => [el.style.gridRow, el.style.gridColumn])
    );
    // Identical to its spawn placement, and resting on the same floor (row 3)
    // as the J's bottom row.
    expect(turned).toEqual([
      ['2', '1'],
      ['2', '2'],
      ['3', '1'],
      ['3', '2'],
    ]);
  });

  test('the turn never tweens — grid placement is not transitionable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const block = page.locator('#nameplate .ch[data-piece="J"] .lattice b').first();
    // Only opacity may transition. A transition-property covering grid
    // placement (or a rotate transform appearing here) would mean the piece
    // can be caught at an angle no tetromino occupies.
    const property = await block.evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(property).toBe('opacity');
    const transform = await block.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe('none');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the mark renders at rest and never reveals', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    await page.waitForTimeout(1000);

    await expect(mark).not.toHaveClass(/revealing/);
    await expect(mark).not.toHaveAttribute('data-turned', 'true');
    // The letters are the mark; they must be readable with no script at all.
    await expect(page.locator('#nameplate .glyph').first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test tests/e2e/wordmark.spec.ts`
Expected: FAIL if Tasks 2–5 aren't done. If they are, this suite should already pass — that's fine, it's the regression net. Confirm each test fails against a deliberately broken version before trusting it: e.g. temporarily set `reveals={true}` on `Nav.astro`'s mark and check `home: the hero owns the reveal` goes red.

- [ ] **Step 3: Make the accessibility sweep scan the resting state**

In `tests/e2e/accessibility.spec.ts`, find the axe sweep's per-route body (the block that calls `page.goto(route)` before running `AxeBuilder`). Immediately after the `goto` and before the axe run, add:

```ts
  // The reveal knocks a letter's color to var(--color-bg) on purpose — the
  // piece shows through where the glyph was. axe alpha-blends a foreground
  // into its background and scores the blend, so a scan landing mid-reveal
  // reports a real contrast failure against a state that lasts ~800ms. Scan
  // the resting state instead: same ruling as the scroll-reveal conflict this
  // repo already settled (see CLAUDE.md) — no exclusions, no rule disabled,
  // just don't scan a transient frame.
  await page.waitForFunction(
    () => !document.querySelector('[data-piece-mark].revealing'),
    undefined,
    { timeout: 5000 }
  );
```

- [ ] **Step 4: Run the accessibility suite**

Run: `npx playwright test tests/e2e/accessibility.spec.ts`
Expected: PASS — no serious/critical violations on all 5 routes.

Verify the wait is load-bearing rather than decorative: temporarily raise `AFTER_TURN_MS` in `PieceMark.astro` to `5000`, re-run, and confirm the sweep now times out on the wait rather than reporting a contrast violation. Put it back to `220` afterwards.

- [ ] **Step 5: Run the full gate**

Run: `npm run test:all`
Expected: PASS — 92 unit, clean build, 53 e2e (43 existing + 10 new).

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/wordmark.spec.ts tests/e2e/accessibility.spec.ts
git commit -m "test: cover wordmark reveal ownership, the turn, and reduced motion"
```

---

## After the plan

Once every task is green, the values worth eyeballing live rather than reasoning about are the mark's `font-size` in `Nav.astro` (`1.25rem`) and `MobileNav.astro` (`1.05rem`), and the four timing constants in `PieceMark.astro`. Per this repo's workflow preference, stand up `npm run dev` and expect several rounds of tuning — and remember HMR is unreliable on `/mnt/c`: restart the server and `curl` for a distinctive string before concluding a value is wrong.

Then update CLAUDE.md: the Navigation section (rail width cap, the stacked mark), the Typography section (Unbounded is no longer scoped to exactly one place), the Hobby details section (the hero's flash is gone; the reveal and its ownership rule replace it), and the Status section (this pass, and the two bugs the plan's own design avoids by construction — grid placement not being transitionable, and the O's no-op falling out of `rotateCw` rather than a special case).
