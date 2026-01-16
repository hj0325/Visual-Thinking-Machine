This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started (Thinking Machine)

### 1) One-time setup

- **Node deps**:

```bash
yarn install
```

- **Python deps** (in your preferred environment):

```bash
python3 -m pip install -r backend/requirements.txt
```

- **Environment variables** (create `.env.local` in repo root; it's gitignored):

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.2
```

### 2) Run (single command)

This starts **Next.js + FastAPI** together:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) and chat from the home page UI.

The backend runs at `http://127.0.0.1:8000` and is proxied through Next routes (`/api/chat`, `/api/feedback`, `/api/health`).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
