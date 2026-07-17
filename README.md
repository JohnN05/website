# Personal Website
### My personal website — an introduction, portfolio, and a few hobby-inspired interactive details.

This repository is for [johnjng.com](https://johnjng.com). It's an Astro +
MDX static site: project write-ups are content files under
`src/content/projects/`, and a handful of interactive details (Tetris,
Minesweeper, a capybara reading-progress mascot, a butterfly-knife-flip
theme toggle) are tucked into the site without needing a caption to make
sense. Deployed on Netlify, with Netlify's built-in form handling powering
the contact page — no backend code.

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
