# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the library implementation. Key areas are `core/`, `rendering/`, `services/`, and `vue/`, with `src/index.ts` as the entry point.
- `tests/` holds Vitest tests (`*.test.ts`) plus helpers like `setup.ts` and `test-utils-*.ts`.
- `demo/` is the Vue 2 demo app and `demo-vue3/` is the Vue 3 demo app for manual verification.
- `docs/` stores design notes and documentation. `dist/` is generated output.
- Tooling configuration lives in `vite.config.ts`, `vite.v3.config.ts`, and `tsconfig.json`.

## Build, Test, and Development Commands
- `pnpm run dev`: start the Vite dev server.
- `pnpm run build`: build the library into `dist/`.
- `pnpm run demo`: run the Vue 2 demo.
- `pnpm run demo:vue3`: run the Vue 3 demo.
- `pnpm run preview`: preview the production build.
- `pnpm run test`: run Vitest.
- `pnpm run test:vue3`: run Vitest using the Vue 3 config.
- `pnpm run lint` / `pnpm run format` / `pnpm run typecheck`: ESLint / Prettier / vue-tsc.

## Coding Style & Naming Conventions
- Use TypeScript and Vue SFCs consistent with existing exports and API shapes.
- Formatting is enforced by Prettier (`printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: none`).
- Keep test files named `*.test.ts` and choose descriptive, feature-based names.

## Testing Guidelines
- Tests run with Vitest + jsdom. Both `@vue/test-utils` and `@vue/test-utils-vue3` are used for Vue 2/3 compatibility.
- Place new tests under `tests/`, following the existing structure (e.g., `tests/custom-blocks/` for block-specific cases).

## Commit & Pull Request Guidelines
- Recent commits commonly use short prefixes like `fix:`, `add:`, `update:`, `docs:`, `chore:`, or `merge:` followed by a brief summary (English or Japanese).
- PRs should include purpose, key changes, and test results (e.g., `pnpm run test`). For UI changes, include demo steps or screenshots.
