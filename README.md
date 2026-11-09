# Formly

A form builder that replaces Google Forms for companies. Drag-and-drop builder, a fast public form renderer, responses and analytics.

The name, logo and auth provider are not final. Placeholders live in `client/next-app/lib/brand.ts`.

## Structure

- `client/next-app`: Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui on Base UI
- `server`: backend, not started yet

## Run the client

```bash
cd client/next-app
npm install
npm run dev
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

## Status

Built so far: marketing home page and navigation, dashboard (create, duplicate, archive, delete with undo, folders, sort, search), form workspace shell with its six tabs, and the form schema with validation and logic. Data is mocked and not saved yet.