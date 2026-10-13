# Deployment verification

## Environment
- Use a Node version supported by the project's Next.js 14 installation (Node 20 is recommended in the README).
- Keep `ANTHROPIC_API_KEY` server-side; never expose it as a `NEXT_PUBLIC_` variable.
- A missing API key is supported and activates the mock decision brief.

## Checks
1. Run `npm install`, `npm run lint`, and `npm run build`.
2. Start the application using `npm run start`.
3. Confirm the dashboard loads the bundled dataset.
4. Move the brush and verify channel charts and the anomaly registry respond.
5. Run analysis with no key to verify fallback behavior.
6. If using an API key, verify the route succeeds without leaking credentials to browser responses.

Treat a successful build as necessary but not sufficient; exercise the UI after deployment.
