# Fiber Connector

A static subscription-link builder for Mihomo / Clash apps, designed for GitHub Pages. Paste one subscription URL per line, generate one combined subscription, and copy it or import it into a compatible installed app.

## Use

1. Paste your HTTP(S) subscription URLs, one per line. Blank lines are ignored and duplicate URLs are merged.
2. Keep the default [SubConverter-Extended public API](https://github.com/Aethersailor/SubConverter-Extended), `https://api.asailor.org/sub`, or enter your own base URL or `/sub` endpoint. Custom path prefixes and query parameters are supported.
3. Generate the link, then **Copy link** or **Import to app**. Import uses the documented [`clash://install-config` scheme](https://www.clashverge.dev/guide/url_schemes.html), supported by apps such as Clash Verge Rev. Your OS must have a compatible handler installed; otherwise paste the copied URL into your app.

The generated URL targets `clash` (Mihomo) with `new_name=true`. Configuration options let you name the imported profile and change the routing template. The default uses this repository’s existing `config/main.ini` on `main`, retaining its proxy groups, rules, and renames. Clear the template field to use the converter’s default configuration. Existing `config/` URLs remain available to consumers.

Link generation happens entirely in your browser. No subscription is stored in cookies, local storage, the page URL, or an account. The site does not fetch subscriptions or call the converter; the client requests conversion when it imports/refreshes the generated URL. At that point the selected API receives the subscription URLs, including any tokens. Choose an API you trust and treat the generated link as sensitive. Public API availability and conversion behavior are controlled by its operator. Clipboard access needs HTTPS or localhost; a manual selection fallback is provided.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**. Push to `main` or run **Deploy GitHub Pages** manually. The workflow builds the static site, runs browser tests, and deploys `dist/`. Relative asset paths support both a project URL (`/fiber-connector/`) and a custom domain. No server, CLI setup, private constants, or backend deployment is needed to use the website.

## Development

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Production build and browser checks:

```sh
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests exercise the production build from a GitHub Pages style subpath, multi-link encoding, custom endpoints, validation, stale-result invalidation, clipboard behavior, import URL generation, and mobile layout. They do not launch a native client or send private subscriptions to a public converter. The former Bun `compile` / `combine` CLI has been removed.
