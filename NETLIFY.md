# Liftly — GitHub + Netlify

This version is configured for Netlify Functions. Push the project to GitHub, then import the repository in Netlify.

## Netlify settings
- Build command: `npm install`
- Publish directory: `.`
- Functions directory: `netlify/functions`

`netlify.toml` already contains these settings and the `/api/*` redirect.

## Important
The current product/user data code still writes to `data/store.json`. Netlify Functions use ephemeral/serverless storage, so this is suitable for a demo but is **not durable production storage**. For production, move users/products/orders to a database such as Supabase, Neon/Postgres, or another persistent database.

The billing endpoint is still a placeholder and does not process card payments. Use Stripe Checkout/Elements for real payments and never store CVV or raw card numbers on Liftly's server.

## GitHub deployment
1. Commit and push the entire folder to GitHub.
2. In Netlify, choose Add new project → Import an existing project → GitHub.
3. Select the Liftly repository.
4. Deploy.
5. Netlify will use `netlify.toml` automatically.

For Shopify live imports, add these Netlify environment variables:
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ACCESS_TOKEN`
- optionally `SHOPIFY_API_VERSION`
