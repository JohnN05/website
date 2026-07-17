# Projects & Contact Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/projects` and `/contact` up to Home's visual identity by reusing existing tokens only (wash colors, `accentForTag`, the `.seam` blur-band pattern, the project-card hover formula, the nameplate's focus-ring treatment) — no new hues, no new spacing scale, no new color-hashing logic.

**Architecture:** Four self-contained file edits. Two page-level edits add an intro band (Projects) and a split two-column band (Contact), each using the existing `.seam` mechanism already proven in `index.astro`. Two component-level edits add a generated cover to `ProjectCard.astro` and restyle `ContactForm.astro` in place (no logic/ARIA/id changes). No `src/lib/` changes and no new unit tests are needed — this whole pass is markup/CSS reuse of already-tested logic (`accentForTag`) and already-tested behavior (`contactForm.ts`'s submit flow, untouched).

**Tech Stack:** Astro (`.astro` component `<style>` blocks, scoped per-file), existing CSS custom properties from `src/styles/tokens.css`.

## Global Constraints

- Reuse existing tokens only: `--wash-featured`, `--wash-hero`, `--space-*`, `--line`, `accentForTag()`. Do not add new colors, new spacing values, or a new tag-hashing function.
- `ProjectCard.astro`'s existing hover/border-reveal behavior (deliberately "chrome-reduced," decided in the visual-refinement pass — see root `CLAUDE.md`) must stay exactly as minimal as it is today. The generated cover is added *content*, not added chrome.
- `ContactForm.astro`: do not change the submit `<script>` logic, `id` attributes, `name` attributes, `role="status"`/`role="alert"`, or the honeypot `bot-field` paragraph. This is a pure restyle. (Wrapping each label+input pair in a `.field` div is the one additive-markup exception — it changes no id/name/role/script behavior, so it's allowed; see Task 4.)
- Draft copy (Projects lede, Contact lede) is a placeholder pending the user's edit — implement it verbatim from the spec; do not invent different copy.
- No project has a `cover` image set today and none exist in `public/` — the cover block in `ProjectCard.astro` is fully generated (no `<img>`, no fallback branch needed).
- This sandbox cannot run Playwright (missing `libnspr4`, no root) — `npm test` (unit) and `npm run build` are the verifiable gate here. Do not attempt `npm run test:e2e`; treat that failure signature as the known environment limitation, not a regression.
- This repo's `/mnt/c/...` WSL2 path means HMR can silently serve stale CSS. After any edit, verifying via a **fresh** `npm run build` (not a running dev server you haven't restarted) is the reliable check.
- **Known pre-existing issue, out of scope:** `tests/e2e/projects.spec.ts` asserts `.project-card` count is `1` and expects only "Rebuilding johnjng.com on Astro" — but `src/content/projects/` actually has 4 non-draft entries today (Terp Rater, Movement Map, Echtralex/Lexicography, the Astro rewrite). This test was already stale before this plan (a prior no-plan-doc pass added 3 project stubs without updating it) and is unrelated to this visual pass. Do not fix it as part of this plan — flag it in the final task's report and let the user decide whether to fix it separately.

---

### Task 1: Projects page intro band

**Files:**
- Modify: `src/pages/projects/index.astro`

**Interfaces:**
- Consumes: `--wash-featured`, `--space-5` through `--space-8`, `--color-text-secondary` (all already defined in `src/styles/tokens.css`); the existing `sorted` array and `<ProjectCard project={p} />` loop (unchanged).
- Produces: nothing new consumed by other tasks — Task 2 (`ProjectCard.astro`) is independent of this task's markup.

- [ ] **Step 1: Replace the page body and styles**

Replace the full file content with:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import { getCollection } from 'astro:content';

const published = await getCollection('projects', ({ data }) => !data.draft);
const sorted = published
  .map((p) => ({ slug: p.slug, ...p.data }))
  .sort((a, b) => b.date.getTime() - a.date.getTime());
---
<BaseLayout title="Projects — John Ng">
  <div class="intro-band">
    <div class="intro-inner">
      <p class="eyebrow">Selected work</p>
      <h1>Projects</h1>
      <p class="lede">A running log of what I've built — extensions, platforms, research tools — with full write-ups landing as I finish them.</p>
    </div>
  </div>
  <div class="seam" style="--seam-from: var(--wash-featured); --seam-to: var(--color-bg);"></div>
  <div class="grid-wrap">
    <div class="project-grid">
      {sorted.map((p) => <ProjectCard project={p} />)}
    </div>
  </div>
</BaseLayout>
<style>
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin: 0 0 var(--space-3);
  }
  .intro-band {
    background: var(--wash-featured);
    padding: var(--space-8) var(--space-5) var(--space-7);
  }
  .intro-inner {
    max-width: 42rem;
    margin: 0 auto;
  }
  .intro-inner h1 {
    font-size: clamp(2rem, 4vw, 2.8rem);
    letter-spacing: -0.01em;
    margin: 0;
    text-wrap: balance;
  }
  .intro-inner .lede {
    font-size: 1.1rem;
    line-height: 1.6;
    max-width: 46ch;
    color: var(--color-text-secondary);
    margin: var(--space-4) 0 0;
  }
  /* Same blur-band mechanism as index.astro's own .seam — one wash band
     fading to flat --color-bg before the grid, not a new pattern. */
  .seam {
    position: relative;
    z-index: 1;
    height: 6rem;
    margin-top: -3rem;
    margin-bottom: -3rem;
    background: linear-gradient(to bottom, var(--seam-from), var(--seam-to));
    filter: blur(32px);
    pointer-events: none;
  }
  .grid-wrap {
    max-width: 72rem;
    margin: 0 auto;
    padding: var(--space-7) var(--space-5) var(--space-8);
  }
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-6);
  }
</style>
```

Note: the old `<h1 class="page-title">Projects</h1>` and its `.page-title` rule are gone — the `h1` now lives inside `.intro-band` and still reads exactly `Projects` as its only text content (required by `tests/e2e/projects.spec.ts`'s `toHaveText('Projects')` and `tests/e2e/nav.spec.ts`'s navigation to `/projects`).

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: build succeeds with no errors. Then:

```bash
grep -o 'intro-band\|wash-featured\|Selected work' dist/projects/index.html
```
Expected: all three strings present in the output HTML, confirming the new markup actually landed in the built page (not stale HMR — see Global Constraints).

- [ ] **Step 3: Commit**

```bash
git add src/pages/projects/index.astro
git commit -m "$(cat <<'EOF'
feat: add wash-tinted intro band to Projects page

Reuses --wash-featured (the same tint Home's own Featured-projects
section already uses) and the existing .seam blur-band mechanism, so
the index page carries that section's identity instead of opening on
a bare h1.
EOF
)"
```

---

### Task 2: ProjectCard generated cover

**Files:**
- Modify: `src/components/ProjectCard.astro`

**Interfaces:**
- Consumes: `accentForTag(tag: string): 'cobalt' | 'maroon' | 'clay' | 'moss'` from `../lib/tags` (already imported in this file, unchanged signature).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace the full file content**

```astro
---
import { accentForTag } from '../lib/tags';

interface Props {
  project: { slug: string; title: string; summary: string; date: Date; tags: string[] };
}
const { project } = Astro.props;
const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(project.date);

const ACCENT_VAR: Record<string, string> = {
  cobalt: 'var(--color-accent)',
  maroon: 'var(--color-accent-maroon)',
  clay: 'var(--color-accent-clay)',
  moss: 'var(--color-accent-moss)',
};
const coverAccent = ACCENT_VAR[accentForTag(project.tags[0] ?? project.title)];
const initial = project.title.charAt(0);
---
<a class="project-card" href={`/projects/${project.slug}`}>
  <div class="cover" style={`--cover-accent: ${coverAccent};`} aria-hidden="true">
    <span class="glyph">{initial}</span>
  </div>
  <div class="card-body">
    <p class="meta">{formattedDate}</p>
    <h3>{project.title}</h3>
    <p class="summary">{project.summary}</p>
    <ul class="tags">
      {project.tags.map((tag) => <li class={`tag tag-${accentForTag(tag)}`}>{tag}</li>)}
    </ul>
  </div>
</a>
<style>
  .project-card {
    display: block;
    border-radius: 6px;
    overflow: hidden;
    border-top: 1px solid transparent;
    text-decoration: none;
    color: var(--color-text);
    transition: border-color 0.18s ease, background-color 0.18s ease;
  }
  .project-card:hover,
  .project-card:focus-visible {
    border-top-color: var(--line);
    background-color: color-mix(in srgb, var(--color-text) 4%, var(--color-bg));
  }
  .cover {
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--color-bg) 88%, var(--cover-accent) 12%);
  }
  .cover .glyph {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 500;
    font-size: 4.5rem;
    line-height: 1;
    color: var(--cover-accent);
    opacity: 0.32;
  }
  .card-body {
    padding: var(--space-5) 0 0;
    transition: padding 0.18s ease;
  }
  .project-card:hover .card-body,
  .project-card:focus-visible .card-body {
    padding: var(--space-5) var(--space-4) var(--space-4);
  }
  .project-card .summary {
    color: var(--color-text-secondary);
  }
</style>
```

Key changes from the current file: the card's own padding moved from `.project-card` to `.card-body` (the cover art needs to sit flush against the card's edges so its top corners can clip to the card's `border-radius`), `overflow: hidden` added to `.project-card` so the cover's square corners clip to that same radius, and the generated `.cover` block (initial letter, `aria-hidden="true"` since it's decorative — same pattern the ambient Tetris board and footer capybara already use for non-content visuals) sits above the untouched meta/title/summary/tags stack.

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: build succeeds. Then:

```bash
grep -o 'class="cover"\|class="glyph"\|cover-accent' dist/projects/index.html | sort -u
```
Expected: all three fragments present, confirming covers rendered for the built project cards.

- [ ] **Step 3: Run unit tests to confirm no regression**

Run: `npm test`
Expected: same pass count as before this change (this file has no `src/lib/` logic of its own — `tags.test.ts` is untouched and should still be fully green).

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectCard.astro
git commit -m "$(cat <<'EOF'
feat: add generated cover art to ProjectCard

No project has a real cover image yet (schema's cover field is unused
sitewide), so each card gets a data-derived cover instead: a tinted
block using the project's own accentForTag() result, with its title's
first letter as a low-opacity mono glyph — the same "colored single
letter as identity" move the Home nameplate already uses for J/O,
generalized to any title. The card's existing chrome-reduced hover
behavior is unchanged; this only adds content above it.
EOF
)"
```

---

### Task 3: Contact page split layout

**Files:**
- Modify: `src/pages/contact.astro`

**Interfaces:**
- Consumes: `--wash-hero`, `--space-*`, `--line` (tokens.css); `<ContactForm />` (Task 4 restyles this component's internals but not its external usage — `<ContactForm />` with no props, unchanged).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace the full file content**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ContactForm from '../components/ContactForm.astro';
---
<BaseLayout title="Contact — John Ng">
  <div class="contact-band">
    <div class="contact-inner">
      <div class="contact-copy">
        <p class="eyebrow">Get in touch</p>
        <h1>Contact</h1>
        <p class="lede">Have a project, a role, or just a question? Send a message below — I read every one.</p>
      </div>
      <div class="contact-card">
        <ContactForm />
      </div>
    </div>
  </div>
  <div class="seam" style="--seam-from: var(--wash-hero); --seam-to: var(--color-bg);"></div>
</BaseLayout>
<style>
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin: 0 0 var(--space-3);
  }
  .contact-band {
    background: var(--wash-hero);
    padding: var(--space-8) var(--space-5);
  }
  .contact-inner {
    max-width: 68rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: var(--space-8);
    align-items: start;
  }
  .contact-copy h1 {
    font-size: clamp(2rem, 4vw, 2.8rem);
    letter-spacing: -0.01em;
    margin: 0 0 var(--space-4);
    text-wrap: balance;
  }
  .contact-copy .lede {
    font-size: 1.1rem;
    line-height: 1.6;
    max-width: 34ch;
    color: var(--color-text-secondary);
    margin: 0;
  }
  .contact-card {
    background: color-mix(in srgb, var(--color-text) 4%, var(--color-bg));
    border-radius: 6px;
    padding: var(--space-6);
  }
  /* Same mechanism as index.astro's own seams; only one is needed here
     (fading wash-hero back to flat before the Footer), matching how
     Home's own hero section has no seam *above* it either — a wash
     band only needs a seam where it meets another section, not at the
     page's very top. */
  .seam {
    position: relative;
    z-index: 1;
    height: 6rem;
    margin-top: -3rem;
    margin-bottom: -3rem;
    background: linear-gradient(to bottom, var(--seam-from), var(--seam-to));
    filter: blur(32px);
    pointer-events: none;
  }
  @media (max-width: 860px) {
    .contact-inner {
      grid-template-columns: 1fr;
    }
  }
</style>
```

Note: `.contact-band` is the page's first element (no wrapping negative-margin seam above it) — deliberately matching Home's own `.hero` section, which likewise has no seam before it. Only the bottom edge (wash-hero → flat bg, before `Footer.astro`) gets a seam, mirroring Home's teaching→footer seam exactly.

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: build succeeds. Then:

```bash
grep -o 'contact-band\|contact-card\|Get in touch' dist/contact/index.html
```
Expected: all three strings present.

- [ ] **Step 3: Commit**

```bash
git add src/pages/contact.astro
git commit -m "$(cat <<'EOF'
feat: split Contact page into Bio-style two-column layout

Left column: eyebrow + heading + lede, mirroring Home's bio-section
rhythm. Right column: the form as a distinct card. Section background
reuses --wash-hero (cobalt, the site's primary-action color) with one
seam fading to flat bg before the footer, matching Home's own
teaching-to-footer seam mechanism.
EOF
)"
```

---

### Task 4: ContactForm restyle

**Files:**
- Modify: `src/components/ContactForm.astro`

**Interfaces:**
- Consumes: `submitContactForm` from `../lib/contactForm` (unchanged import/signature).
- Produces: nothing consumed by other tasks. All `id`/`name`/`role` attributes referenced by `tests/e2e/contact.spec.ts` (`#name`, `#email`, `#message`, `#contact-form`, `#contact-success`, `#contact-error`, the submit button inside `#contact-form`) are preserved exactly.

- [ ] **Step 1: Replace the full file content**

```astro
<form name="contact" method="POST" data-netlify="true" id="contact-form" class="contact-form">
  <input type="hidden" name="form-name" value="contact" />
  <p hidden>
    <label>Don't fill this out if you're human: <input name="bot-field" /></label>
  </p>
  <div class="field">
    <label for="name">Name</label>
    <input id="name" name="name" type="text" required />
  </div>
  <div class="field">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required />
  </div>
  <div class="field">
    <label for="message">Message</label>
    <textarea id="message" name="message" required rows="6"></textarea>
  </div>
  <button type="submit">Send</button>
</form>
<p id="contact-success" hidden role="status">Thanks — I'll get back to you soon.</p>
<p id="contact-error" hidden role="alert">Something went wrong — please try again or reach out on LinkedIn/GitHub.</p>
<style>
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 32rem;
  }
  .contact-form[hidden] {
    display: none;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .field label {
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text);
  }
  .field input,
  .field textarea {
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    padding: 0.65rem var(--space-3);
    border-radius: 6px;
    border: 1px solid var(--line);
    background: var(--color-bg);
    color: var(--color-text);
  }
  .field input:focus-visible,
  .field textarea:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-color: var(--color-accent);
  }
  .contact-form button {
    align-self: flex-start;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    padding: 0.7rem 1.7rem;
    border-radius: 6px;
    background: var(--color-accent);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .contact-form button:hover {
    background: color-mix(in srgb, var(--color-accent) 85%, black 15%);
  }
  .contact-form button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  #contact-success,
  #contact-error {
    margin: var(--space-4) 0 0;
    padding: var(--space-4);
    border-radius: 6px;
    font-size: 0.95rem;
  }
  #contact-success {
    background: color-mix(in srgb, var(--color-accent-moss) 14%, var(--color-bg));
    color: var(--color-text);
  }
  #contact-error {
    background: color-mix(in srgb, var(--color-error) 12%, var(--color-bg));
    color: var(--color-error);
  }
</style>
<script>
  import { submitContactForm } from '../lib/contactForm';

  const form = document.getElementById('contact-form') as HTMLFormElement;
  const success = document.getElementById('contact-success')!;
  const error = document.getElementById('contact-error')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const data = new FormData(form);
    try {
      const ok = await submitContactForm({
        name: String(data.get('name')),
        email: String(data.get('email')),
        message: String(data.get('message')),
      });
      if (ok) {
        form.hidden = true;
        success.hidden = false;
      } else {
        error.hidden = false;
      }
    } catch {
      error.hidden = false;
    }
  });
</script>
```

The `<script>` block is byte-for-byte identical to the current file — only the markup (each label+input pair now wrapped in a `.field` div — additive only, no `id`/`name`/`for` changed) and the `<style>` block changed.

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: build succeeds. Then:

```bash
grep -o 'class="field"\|contact-form button' dist/contact/index.html
```
Expected: `class="field"` present (three times, once per field).

- [ ] **Step 3: Run unit tests to confirm no regression**

Run: `npm test`
Expected: same pass count as before (this file's logic lives in `src/lib/contactForm.ts`, untouched — `contactForm.test.ts` should still be fully green).

- [ ] **Step 4: Commit**

```bash
git add src/components/ContactForm.astro
git commit -m "$(cat <<'EOF'
style: restyle ContactForm to match site's token system

Pure visual pass — submit logic, ids, and ARIA roles are unchanged.
Inputs get border-radius/--line borders/a real :focus-visible ring
(same treatment the Home nameplate button already defines), labels
pick up Inter (the site's already-assigned UI-copy face, which this
form never applied), and the button/status messages get hover and
color-mix-derived states instead of flat, unstyled defaults.
EOF
)"
```

---

### Task 5: Whole-branch verification and report

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests pass, same total count as on `main` before this plan (no `src/lib/` file was touched by Tasks 1–4).

- [ ] **Step 2: Run a clean production build**

Run: `rm -rf dist && npm run build`
Expected: build succeeds with no errors or warnings about the touched files.

- [ ] **Step 3: Confirm both pages' distinctive strings in the build output**

```bash
grep -o 'intro-band\|Selected work' dist/projects/index.html | sort -u
grep -o 'contact-band\|Get in touch\|class="field"' dist/contact/index.html | sort -u
grep -o 'class="cover"' dist/projects/index.html | wc -l
```
Expected: first two greps each return their strings; the third returns `4` (one cover per non-draft project: Terp Rater, Movement Map, Echtralex/Lexicography, the Astro rewrite).

- [ ] **Step 4: Report to the user**

State plainly in the final message:
- Unit tests: pass count.
- Build: clean or not.
- That `npm run test:e2e` was not run (this sandbox lacks Playwright's `libnspr4` dependency — known, pre-existing environment limitation) and a real-environment Playwright run is still needed before merging to `main`, per this repo's standing workflow preference.
- The pre-existing stale `tests/e2e/projects.spec.ts` count assertion (see Global Constraints) — flag it, do not fix it silently.
- List the 4 commits made (one per task).

Do not commit anything in this task — it is verification and reporting only.
