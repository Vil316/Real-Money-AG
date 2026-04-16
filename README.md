# Real Money

Real Money is a mobile-first personal finance app built with React, Vite, Supabase, and Plaid. The current codebase includes onboarding, account tracking, recurring bills, savings goals, debts, and transaction sync flows.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI + Framer Motion
- Supabase Auth, Postgres, and Edge Functions
- Plaid transaction and balance sync
- React Query for client-side data fetching and caching

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your Supabase project values:

   ```bash
   cp .env.example .env
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

## Environment Variables

The frontend expects these values in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Supabase Edge Functions also require the relevant server-side secrets in your Supabase project environment, including Plaid credentials and any AI provider keys used by the categorization flow.

## Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` runs TypeScript build checks and creates a production bundle
- `npm run lint` runs ESLint across the workspace
- `npm run test` runs the Vitest suite once
- `npm run test:watch` starts Vitest in watch mode

## Supabase Notes

- Database schema lives in `supabase/schema.sql`
- Initial migration lives in `supabase/migrations/20260414_init.sql`
- Function-specific Supabase local config lives in `supabase/config.toml`

## Current Hardening Focus

- Atomic ledger updates now run through database RPC functions instead of multi-step client mutations
- Synced Plaid transactions are protected by a unique `(user_id, external_transaction_id)` constraint
- Financial helper coverage has been added first; broader integration coverage is still needed# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
