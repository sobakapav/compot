# AGENTS.md — Project Guidance for Compot

This file describes the key constraints, layout rules, and implementation conventions that agents must follow when working on this project.

## General Principles
- **Primary goal:** WYSIWYG parity. The PDF output must be as close as possible to the HTML editor layout (pixel‑level alignment when practical).
- **No database:** Data is stored in JSON files on disk.
- **Single‑user internal tool:** No roles/permissions.
- **Keep changes local to the project:** Modify only files inside the project workspace.

## Routing / Pages
- `/new` creates a new proposal and opens editor **only when the data repo has no proposals**. If proposals exist, it redirects to `/all`.
- `?force=1` on `/new` always creates a new proposal.
- `/edit` edits an existing proposal.
- `/view` shows a proposal in read‑only mode.
- `/all` lists proposals and versions.
- The homepage shows a card for the most recently edited proposal.

## PDF Generation
- PDF is produced with Playwright.
- Always ensure **PDF layout matches HTML** for all blocks: spacing, alignment, fonts, and lists.
- Any layout change in `/edit` must be mirrored in `/print` (and typically `/view`).

## Layout & Spacing Rules (must match in HTML and PDF)
- **Vertical spacing between all blocks:** 24px (including comments).
- In `/edit`, there is **extra hygienic space above and below** the page for editing only (not in PDF): currently 32px top/bottom.

## Typography
- Use **PT Sans Narrow** only (no other fonts unless explicitly requested).
- Headline font size is 24px with line‑height 1.2 unless changed.

## Rich Text Fields
- `summary`, `scope`, and `nuances` are rich text.
- Support bold, links, ordered and unordered lists.
- Links open in new tabs.
- Rich text formatting must render identically in HTML and PDF.

## Header Block Rules
- Phrase layout: “Коммерческое предложение / на [услуга] / для компании [лого] [компания]”
- `serviceName` and `clientName` are bold.
- Service and company fields should align to the baseline with the surrounding text.
- Client logo is height‑locked, preserves aspect ratio, not rounded.

## Tasks Block
- Labels: “Цель заказчика” and “Задача Собаки Павловой”.
- Logo in the label is circular, aligned to the text baseline.
- Labels share the same baseline.

## Plan Block
- Title: “Этапы и результаты работ”.
- Columns (order): **Этап, Часы, Итерации, Дни, Стоимость, [gap 16px], Результаты**.
- Column widths (HTML & PDF) are synchronized using the same grid template.
- Iterations show “×” and red if >1, hidden (white) if =1.
- Numbers in Hours/Days/Cost are right‑aligned; Days are gray.
- Stage name is bold, stage number is normal weight.
- Results field supports multiline list logic (Enter -> unordered list). It must be LTR.
- Totals row: sum of Hours*Iterations and sum of Costs on green pills with white text, right‑aligned to columns. Pill padding should not shift text alignment.

## Nuances Block
- Separate block below Plan, **no visible header**.
- Default text: “Детальный план производства — в отдельном документе”.
- Rich text behaves the same as summary/scope.

## Comment Blocks
- Comment blocks (for Header, Tasks, Plan, Cases) are independent blocks.
- Title sits **above** the comment text, both in columns 3–5; columns 1–2 are empty.
- Comment text is rich text with the same controls as `summary`/`scope`.

## Cases Block (“Похожие проекты”)
- 5 cards per row.
- Support 1 or 2 rows in a single block. Row count is controlled by data (see `casesRows`).
- Card content order: preview (square), client name, case title, short link (sbkpv.ru/slug with slug bold).
- No card borders; minimal padding; preview has smaller corner radius.
- Selection control appears in the right panel only when Cases block is focused.
 - Row titles are editable plain text: `casesTitle1` and `casesTitle2`.
 - Defaults:
   - One row: title is “Похожие проекты”.
   - Two rows: titles are “Похожие проекты 1” and “Похожие проекты 2”.
 - When removing the second row, truncate cases to 5 and reset title “Похожие проекты 1” → “Похожие проекты”.

## Footer Block
- Contains “Коммерческое предложение действует до …” with date badge.
- “С уважением,” and “Собака Павлова” in headline font; brand logo is circular.
- Contact block: phone, email (blue link), tg (blue link), with fixed vertical spacing.

## Data & Versions
- Proposals have versions; versions are timestamped.
- PDF generation should always save a version.
- Auto‑save only stores a new version when data changes.
- “Marked as актуальная” logic: if user explicitly sets it, keep; otherwise auto‑recompute on version changes.

## Data Storage
- Proposals live in a separate data‑repo (configured via `config.json`).
- Code repo `data/proposals` is legacy and should not be used.

## Implementation Notes
- Avoid introducing extra wrapper spacing that changes layout between HTML and PDF.
- If a layout changes in `/edit`, update `/view` and `/print` to match.
- Keep URL and list data normalized (services use ID extracted from URL).
