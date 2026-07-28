
# BrickLedger AI Agent Instructions

## Project Overview
BrickLedger is a cross-platform (iOS & Android) property investment management app built with React Native (Expo) and TypeScript. It uses Supabase for authentication and database, and aims for a modular, secure, and offline-friendly architecture. The UI is modern, responsive, and mobile-first.

## Architecture & Key Patterns
- **App Structure:**
	- Main app code is in `/app` (screens, navigation, routing via Expo Router)
	- Shared UI components in `/components` (e.g., `AskAIChat`, `DatePicker`, `EntityContext`)
	- Business logic and API wrappers in `/lib` (e.g., `supabase.ts`, `logger.ts`, `ai/insights.ts`)
	- Styles in `/styles` (screen/component-specific, plus `GlobalStyles.ts`)
- **Navigation:**
	- Uses Expo Router with a tab-based layout (`/app/(tabs)/_layout.tsx`).
	- Auth flow is enforced in `/app/_layout.tsx` using `getCurrentUser()` from `lib/supabase/auth.ts`.
- **State & Context:**
	- Entity selection and user context are managed via `EntityContext` (`components/EntityContext.tsx`).
- **Supabase Integration:**
	- All DB/auth logic is in `/lib/supabase/*`. Use the exported `supabase` client from `lib/supabase.ts`.
	- Auth, entity, property, and account operations are wrapped in async functions with logging.
- **AI Integration:**
	- AI chat and portfolio suggestions use `lib/ai/insights.ts` and the `AskAIChat` component.
	- AI API keys are loaded from environment variables (see `MISTRAL_API_KEY`).
- **Logging:**
	- Use the `Logger` utility (`lib/logger.ts`) for all debug/info/error logs. Transaction IDs are used for traceability.
- **Styling:**
	- Use `GlobalStyles` for shared styles and screen-specific styles in `/styles`.
	- Color scheme support via `useColorScheme` hook/component.

## Developer Workflows
- **Install dependencies:** `npm install`
- **Start app:** `npm start` (or `npm run ios`, `npm run android`, `npm run web`)
- **Testing:** `npm test` (Jest, see `jest-expo` preset)
- **Debugging:**
	- Use `Logger` for in-app logs (visible in Metro/console)
	- Navigation/auth issues: check `/app/_layout.tsx` and `/lib/supabase/auth.ts`
- **Schema:**
	- Supabase schema and policies are in `supabase-init-schema.sql` (for reference, not direct execution)

## Project Conventions
- **TypeScript strict mode** is enforced (`tsconfig.json`).
- **Absolute imports** use `@/` alias (see `tsconfig.json`).
- **All API/database access** should go through `/lib/supabase/*` wrappers, not direct client calls in components.
- **Context/state** should be provided via React Context (see `EntityContext`).
- **AI/ML features** should use `/lib/ai/insights.ts` and be surfaced via `AskAIChat`.
- **Sensitive keys** (API, Supabase) must be loaded from environment/config, not hardcoded.

## Examples
- To fetch the current user: `getCurrentUser()` from `lib/supabase/auth.ts`
- To log an event: `Logger.info('message', {context}, 'source.tsx', transactionId)`
- To add a new property: use the async wrapper in `lib/supabase/properties.ts`
- To show AI chat: use `<AskAIChat ... />` with portfolio summary/metrics

## References
- See `README.md` for high-level overview and scripts
- See `.github/copilot-instructions.md` (this file) for AI agent guidance
- See `/lib/` for all business logic and API integration patterns
