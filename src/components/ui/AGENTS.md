# UI Component Guidelines

Rules for creating and modifying components in `src/components/ui/`.

## Exports

- **Named exports only** — never use `export default`.
- Re-export every component from `src/components/ui/index.ts` (barrel file).

## TypeScript

- Extend native HTML element props via `ComponentProps<'element'>` from React.
- Combine with `VariantProps<typeof variants>` when using `tailwind-variants`.
- React 19 supports `ref` as a regular prop — `forwardRef` is not required.

## Styling with `tailwind-variants`

Use `tv()` from `tailwind-variants` for any component that has visual variants.

```tsx
import { tv, type VariantProps } from 'tailwind-variants'

const buttonVariants = tv({
  base: '...',
  variants: { size: { sm: '...', md: '...' } },
  defaultVariants: { size: 'md' },
})
```

### CRITICAL: className merging

`tailwind-variants` already uses `tailwind-merge` internally. **Do NOT wrap** the result in `cn()` or `twMerge()`. Instead, pass `className` directly into the `tv()` call:

```tsx
// CORRECT
<button className={buttonVariants({ variant, size, className })} />

// WRONG — double merge, breaks specificity
<button className={cn(buttonVariants({ variant, size }), className)} />
```

### When to use `cn()`

Only use `cn()` (from `@/lib/utils`) for **simple components without `tv()` variants** — e.g. `Card`, `Label`, `Table`, `Modal*`.

```tsx
import { cn } from '@/lib/utils'

<div className={cn('rounded-xl bg-surface-container-lowest p-8', className)} />
```

## File naming

- One file per component (or per logical group like `modal.tsx`, `table.tsx`).
- Lowercase kebab-case filenames: `button.tsx`, `pagination.tsx`.
- Export the `tv()` variants object alongside the component when consumers may need it.

## `'use client'` directive

Only add `'use client'` when the component uses browser APIs, hooks, or event handlers that require client rendering. Server-compatible components should omit it.

## Color tokens (MD3)

Use the custom MD3 color tokens defined in `globals.css` via `@theme`:

| Token | Usage |
|---|---|
| `primary` / `on-primary` | Primary actions |
| `secondary` / `on-secondary` | Secondary actions |
| `tertiary` / `on-tertiary` | Accents |
| `error` / `on-error` | Destructive actions |
| `surface` / `on-surface` | Backgrounds / text |
| `surface-container-*` | Elevated surfaces (lowest, low, default, high, highest) |
| `on-surface-variant` | Secondary text |
| `outline` / `outline-variant` | Borders |
| `primary-container` / `on-primary-container` | Tinted containers |
| `inverse-surface` / `inverse-on-surface` | Dark badges/chips |

Standard Tailwind colors (slate, emerald, amber, etc.) are also available and used in some badge variants.

## Fonts

- `font-body` / `font-label` — Inter (400/500/600)
- `font-headline` — Manrope (600/700/800)

## Icons

Material Symbols Outlined font is loaded globally. Use via:

```tsx
<span className="material-symbols-outlined">icon_name</span>
```

## HTML-to-React conversion workflow

When converting raw HTML mockups or prototypes into React components, **always audit before writing code**.

### Step 1 — Component mapping

Scan every raw HTML element and map replacements:

| Raw HTML | Replacement |
|---|---|
| `<button>` | `<Button>` from `@/components/ui` |
| `<input>` | `<Input>` from `@/components/ui` |
| `<label>` | `<Label>` from `@/components/ui` |
| `<a>` (navigation) | `<Link>` from `next/link` |
| `<a>` styled as button | `<Link>` with button classes, or `<Button>` with `onClick` + `router.push` |
| `<a href="#">` (action) | `<Button variant="ghost">` — Biome rejects `href="#"` |
| `<img>` | `<Image>` from `next/image` |
| Badge-like `<span>` | `<Badge>` from `@/components/ui` |
| Copyright `<p>` | `<Copyright>` from `@/components/ui` |
| Tab-like `<button>` groups | `<TabList>` + `<Tab>` from `@/components/ui` |
| `<input type="checkbox">` (switch) | `<Toggle>` from `@/components/ui` |

### Step 2 — Layout audit

Check the source HTML for:

- **Design inconsistencies** with existing pages (spacing, colors, opacity values, border radii, max-widths). Cross-reference sibling pages in the same flow.
- **Tailwind anti-patterns**: redundant classes, conflicting utilities, missing responsive breakpoints.
- **Accessibility gaps**: missing `alt` text, missing `aria-*` attributes, non-semantic elements used for interactive controls.
- **Hardcoded values** that should use design tokens (e.g., `bg-[#117f99]` instead of `bg-primary`, hardcoded year instead of `<Copyright />`).

### Step 3 — Present findings, then implement

Report the mapping + audit results **before** writing code. Format:

1. **Component Mapping** — table of replacements
2. **Layout Audit** — bulleted list of issues found
3. **Proposed Fixes** — how each issue will be resolved

### Logo usage

- `/logo.svg` — white "A" + orange accent. Use on **dark backgrounds** (login left panel, dark sidebars).
- `/logo-dark.svg` — #30373d "A" + orange accent. Use on **light backgrounds** (centered card pages).
- Never use an icon-based logo placeholder (`account_balance`, etc.) — always use the project SVGs.

### Auth page design tokens (centered-card pattern)

Pages like esqueci-minha-senha and redefinir-senha share these exact tokens:

| Element | Classes |
|---|---|
| Outer wrapper | `bg-gray-100 p-4 min-h-screen items-center justify-center` |
| Card | `overflow-hidden shadow-xl rounded-xl bg-surface-container-lowest p-8 md:p-10 items-center` |
| Icon circle | `h-16 w-16 bg-primary-fixed/30` |
| Title | `text-[#30373d] font-headline text-2xl font-extrabold` |
| Description | `text-on-surface-variant text-sm` |
| Submit button | `bg-primary-container rounded-xl py-3.5 hover:bg-primary shadow-lg shadow-primary/20 active:scale-[0.98]` |
| Back link | `gap-2 text-outline hover:text-primary duration-200` |
| Copyright | `<Copyright />` component below card |

When building new auth pages, match these exactly to maintain visual consistency across the flow.

## API Integration

- **Always use Orval-generated hooks** from `src/http/api.ts` — never use native `fetch`, Axios, or manual API calls.
- Generated hooks follow the pattern `usePost*`, `useGet*`, `usePut*`, `useDelete*`.
- Run `yarn orval` to regenerate hooks when the backend Swagger spec changes.

### Form + API pattern

- **Validation**: react-hook-form + zod for client-side validation.
- **Submission**: call `mutateAsync({ data: { ... } })` inside the form's `onSubmit` handler.
- **State management**: use React Query mutation states (`isPending`, `isSuccess`, `isError`, `error`, `reset`) — **never manual `useState` booleans** for tracking submission/success/error.
- **Loading state**: disable the button and show loading text using `isPending`.
- **Success state**: conditionally render success UI using `isSuccess`.
- **Error handling**: All backend error messages are in English. **NEVER display raw API errors to the user.** Always pass the error object through `translateError()` from `src/lib/error-translator.ts` to map it to Portuguese:

```tsx
import { translateError } from '@/lib/error-translator'

{isError && (
  <p className="mt-1 text-xs text-error">
    {translateError(error)}
  </p>
)}
```

The function extracts the API message, looks it up in a dictionary, and falls back by HTTP status code if no match is found. When the backend adds new error messages, add the English→Portuguese mapping to `ERROR_MAP` in `error-translator.ts`.

- **"Try again" / reset**: call `reset()` from the mutation to clear `isSuccess`/`isError` and return to the form.

### Token Lifecycle

The `customFetch` mutator in `src/http/fetch-client.ts` handles silent token refreshing. Developers don't need to manually check for 401 errors in components. If a user is unauthenticated or their refresh token expires, they will be automatically redirected to `/login`.

Key behaviors:

- Every request automatically includes the `Authorization: Bearer` header from the `ematrix_token` cookie.
- On 401 (non-auth endpoints), the mutator silently calls `POST /refresh-token` and retries the original request once with the new token.
- Concurrent 401s share a single refresh attempt via a module-level lock (`refreshPromise`), preventing race conditions.
- If the refresh token is missing or expired, cookies and localStorage are cleared and the user is hard-redirected to `/login`.
- Auth endpoints (`/sessions`, `/refresh-token`) are excluded from the refresh-and-retry flow to avoid infinite loops.
