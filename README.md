# johnjng.com

Hi, I'm John. This is the repo for [johnjng.com](https://johnjng.com) — my
personal corner of the internet: an introduction, a portfolio of project
write-ups, and a few hobby-inspired details I couldn't resist tucking in
(Tetris playing itself behind the hero, Minesweeper hiding on the 404 page,
an S-piece that flips the theme, a capybara in the footer).

## How this site was built

Full transparency: this version of the site was entirely vibe-coded. My
previous site I wrote line-by-line myself; this time I rebuilt it from
scratch by directing an AI pair programmer through the whole process. What
didn't change is where the decisions come from — every design call, every
interaction, every detail (and every feature that got cut) was mine, and I
kept iterating until each one felt right. I hope that shines through.

Under the hood it's an Astro + MDX static site: project write-ups are
content files under `src/content/projects/`, and the interactive details
hydrate as islands. Deployed on Netlify, with Netlify's built-in form
handling powering the contact page — no backend code.

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npm test           # unit tests (Vitest)
npm run test:e2e   # e2e + accessibility tests (Playwright + axe-core)
npm run test:all   # unit + build + e2e, in sequence
```

Adding a project write-up: drop a new `.mdx` file into `src/content/projects/`
(copy `_template.mdx` as a starting point) — no code changes needed.

## Find a bug?

If you found an issue or would like to submit improvements to this project, please submit an issue using the issues tab above or contact me directly.  Thanks! :)

## Authors

[JohnN05](https://github.com/JohnN05) - Developer

## License

This project is licensed under **GNU GPL-3.0** - see the [LICENSE](LICENSE) file for details
