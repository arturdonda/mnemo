# Mnemo — Brand kit

Layers-as-M. Three vertical bars: tall · short (centered upper third) · tall.
The short middle bar carries the sole accent and is the entire conceptual payload —
three indexes (FEAT cache · semantic search · structural graph) that together form
an M.

## Files

| File                      | Use                                                                      |
| ------------------------- | ------------------------------------------------------------------------ |
| `mnemo-mark.svg`          | Primary mark on light surfaces                                           |
| `mnemo-mark-dark.svg`     | Primary mark on dark surfaces                                            |
| `mnemo-mark-mono.svg`     | Single-color (`currentColor`) — for badges, inline text, embossed stamps |
| `mnemo-lockup-h.svg`      | Horizontal mark + wordmark, light bg                                     |
| `mnemo-lockup-h-dark.svg` | Horizontal mark + wordmark, dark bg                                      |
| `mnemo-lockup-v.svg`      | Vertical (stacked) lockup                                                |
| `favicon.svg`             | 16×16 optimized version                                                  |
| `tokens.css`              | CSS custom properties — color, type, radius                              |

## Color

| Token   | Value                  | Role                                    |
| ------- | ---------------------- | --------------------------------------- |
| `ink`   | `oklch(0.18 0.01 80)`  | Foreground — text, mark on light        |
| `paper` | `oklch(0.96 0.005 80)` | Background — mark on dark               |
| `amber` | `oklch(0.68 0.13 70)`  | Sole accent — center bar, status, links |

The accent has one job: it is the **middle layer** of the mark. Use it sparingly elsewhere —
status indicators, primary links, the active state. Never for body text or large fills.

## Type

- **Inter** — UI, wordmark, headings. Wordmark uses 600 weight, tracking −0.04em, all-lowercase.
- **JetBrains Mono** — terminal, code, version chips, eyebrow labels.

## Geometry

The mark is built on a 96×96 canvas:

- Bar width: 14
- Bar gap: 10
- Outer bars: y=18, h=60
- Center bar: y=29.2, h=37.6 (upper third — sits ~32% below the top, not centered)

Don't tweak these by hand — re-export from the source if proportions need changing.

## Clear space

Reserve at minimum **one bar-width** (14u in the 96 grid) of empty space on every side
of the mark or lockup. More is better. Never crop into the bars.

## Don'ts

- Don't recolor the center bar to anything but amber (or paper/ink for monochrome use).
- Don't add a background fill behind the mark — it lives directly on paper or ink.
- Don't rotate, skew, outline, or apply effects (shadow, glow, gradient).
- Don't substitute the wordmark font.
- Don't pair with the persistent-dot variant of the wordmark — we tested it, it's redundant with the mark.
