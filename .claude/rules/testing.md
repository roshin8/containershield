## Testing

- Unit tests: vitest, colocated as `*.test.ts`
- E2E tests: Playwright, in `tests/e2e/`
- Run `npm run test` for unit tests, `npm run test:e2e` for e2e
- Test spoofed values are deterministic given the same seed
- Test that spoofed values differ across different seeds
- Don't mock browser APIs in integration tests, use real extension loading
