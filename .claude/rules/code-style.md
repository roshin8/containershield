## Code Style

- TypeScript strict mode, no `any` types unless wrapping browser APIs that lack types
- Match existing naming: camelCase for variables/functions, PascalCase for types/components
- Imports: group by external, internal, types. Match existing file's import order.
- No default exports except React components
- Prefer `const` arrow functions for non-exported helpers
- Use existing PRNG/crypto utilities in `src/lib/crypto.ts` instead of creating new ones
