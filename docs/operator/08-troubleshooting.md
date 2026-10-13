# Troubleshooting

## Dashboard does not start
Confirm the installed Node version and dependencies. Run `npm install`, then `npm run dev`. Consult the terminal for the first error rather than assuming an API-key problem.

## Charts have no readings
Check that the bundled JSON file exists under `public/data/`, then inspect the browser console and server output for loading or parsing errors.

## Analysis seems generic
The application deliberately supports mock fallback when no Anthropic key is configured or a model response fails schema validation. Generic-looking output alone does not distinguish these cases.

## Build fails
Run `npm run lint` and `npm run build` separately to isolate style, type, or framework errors. Record exact command output and the commit SHA before filing an issue.
