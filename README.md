# EventHub

EventHub is a service marketplace for discovering and booking event services — photography, catering, decor, workers, and more. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [VS Code](https://code.visualstudio.com/)
- The **ES7+ React/Redux snippets** and **Tailwind CSS IntelliSense** extensions are recommended but not required

## Setup in VS Code (Windows)

1. **Open the project folder**

   Launch VS Code → `File` → `Open Folder` → select the `project` folder.

2. **Open the integrated terminal**

   `Terminal` → `New Terminal` (or press `` Ctrl+` ``).

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Configure environment variables**

   A `.env` file is included with the Supabase project URL and anon key. These are public client-side keys, not secrets. If you need to connect to a different Supabase project, edit `.env`:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   VS Code will display a `localhost` link in the terminal. Click it (or open the URL in your browser) to view the app.

6. **Build for production**

   ```bash
   npm run build
   ```

   The compiled output goes to the `dist/` folder. Preview it with:

   ```bash
   npm run preview
   ```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Compile and bundle for production |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run TypeScript type checking (no output files) |
| `npm run lint` | Run ESLint |

## Project Structure

```
project/
├── src/
│   ├── components/    Reusable UI components
│   ├── pages/         Page-level views
│   ├── lib/           Shared utilities (auth, supabase client, router, types)
│   ├── App.tsx        Root component with routing
│   ├── main.tsx       App entry point
│   └── index.css      Global styles + Tailwind directives
├── supabase/
│   ├── migrations/    Database schema migrations
│   └── functions/     Edge functions (AI assistant, OTP auth, payments)
├── public/            Static assets (logo, images)
├── .env               Supabase credentials (public anon key)
└── package.json
```

## Tech Stack

- **React 18** + **TypeScript** — UI framework and type safety
- **Vite 5** — Build tool and dev server
- **Tailwind CSS 3** — Utility-first styling
- **Supabase** — Database, authentication, storage, and edge functions
- **lucide-react** — Icon library
