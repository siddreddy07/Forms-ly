# Formly

A form builder for client work. Drag blocks into place, share a link, and see exactly where people drop off.

**What you can do**

- **Build** forms with drag-and-drop blocks, multiple pages and conditional logic
- **Design** the look: page colour, accent, font, corners and width
- **Share** a public link, with an optional closing date or a 4-digit code
- **Collect** answers, including file uploads, in a searchable, filterable table you can export as CSV
- **Analyse** views, completions and drop-off

## Project layout

| Folder | What it is |
|---|---|
| `client/next-app` | The web app: Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui |
| `server` | The API: Express, Drizzle ORM, Postgres on Neon, Clerk for sign-in |

Optional pieces: Upstash Redis (read cache) and ImageKit (file uploads).

## Run it locally

You need Node.js, a [Clerk](https://clerk.com) app and a [Neon](https://neon.tech) Postgres database.

**1. Server**

```bash
cd server
cp .env.example .env     # fill in Clerk and Neon; the rest is optional
npm install
npm run db:migrate       # create the tables
npm run dev
```

**2. Client**

```bash
cd client/next-app
cp .env.example .env.local   # fill in Clerk and NEXT_PUBLIC_API_URL (the server's address)
npm install
npm run dev                  # http://localhost:3000
```

Set `CLIENT_URL` in `server/.env` to the client's address, so the API accepts its requests.

## Useful scripts

| Where | Command | What it does |
|---|---|---|
| client | `npm run typecheck`, `lint`, `build` | Check and build the app |
| server | `npm run typecheck`, `build` | Check and build the API |
| server | `npm run db:generate` | Create a migration after changing `src/schema.ts` |
| server | `npm run db:migrate` | Apply migrations |
| server | `npm run db:studio` | Browse the database |

## Deploy

**API on Render.** Create a Blueprint from this repo (it reads `render.yaml`) and fill in the environment variables it lists. Set `CLIENT_URL` to the web app's final address. Run `npm run db:migrate` once against the production database.

**Web app on Cloudflare Workers** (through OpenNext). From `client/next-app`:

```bash
npx wrangler login
# Set these in .env.production first; NEXT_PUBLIC_* values are baked in at build time:
#   NEXT_PUBLIC_API_URL=<your Render URL>, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, and the Clerk sign-in URLs
npx wrangler secret put CLERK_SECRET_KEY
npm run cf:deploy
```

`npm run cf:preview` runs the built app locally on the Workers runtime. Finally, add the deployed web address to your Clerk instance (allowed origins and redirect URLs).

## Optional services

- **Redis cache:** set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without them every read goes straight to Postgres.
- **File uploads:** set the `IMAGEKIT_*` keys and `STORAGE_ENCRYPTION_KEY`. Without them uploads are off.

## More docs

`Project.md` (the product), `FrontendPlan.md` and `FrontendDesign.md` (the client), `BackendPlan.md` and `server/database.mmd` (the server and database diagram).

The name, logo and brand colours live in `client/next-app/lib/brand.ts`.
