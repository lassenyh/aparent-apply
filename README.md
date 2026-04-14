# Aparent Apply

Minimal, editorial application page built with Next.js 16, App Router, TypeScript, and Tailwind CSS.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file and fill values:

```bash
cp .env.example .env.local
```

Required env vars:

- `RESEND_API_KEY`
- `ADMIN_EMAIL` (default target is `work@aparent.tv`)

Optional:

- `RESEND_FROM` (recommended verified sender, e.g. `Aparent Apply <jobs@yourdomain.com>`)

3. Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Form behavior

- Required fields: `Navn`, `Showreel URL`, `CV PDF`, `Erfaring`
- CV is validated as PDF
- Upload size limit: 4 MB (CV, production-safe on Vercel server actions)
- Submission runs server-side with a Next.js server action
- Email is sent via Resend to `ADMIN_EMAIL`
- Uploaded CV is sent as email attachment

## Vercel deployment (recommended)

1. Push project to GitHub and import into Vercel.
2. In Vercel Project Settings -> Environment Variables, add:
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL` (`work@aparent.tv`)
   - `RESEND_FROM` (must be a verified sender/domain in Resend)
3. In Resend:
   - Verify your sending domain
   - Use the same sender as `RESEND_FROM`
4. Redeploy after env vars are added.
5. Test in production:
   - Submit one test application
   - Confirm mail arrives at `ADMIN_EMAIL`
   - Confirm CV arrives as attachment

## Production notes

- Keep CV below 4 MB to avoid serverless body-size issues.
- If you need larger files later, move file upload to object storage and email links instead of attachments.
