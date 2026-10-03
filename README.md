# FlightOps PS5

Browser-based career companion for Microsoft Flight Simulator 2024 on PS5.

## Deployment

Vercel deployments require the browser-safe `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` environment variables. Never configure a
service-role key or other privileged Supabase credential in the browser.
