# RecyLight Ltd storefront preview and PWA

This is a dependency-free static storefront. It has no package manager, build step, or connected commerce backend. The PWA enhancement adds an installable storefront shell and an offline information page without caching customer or admin data.

## Run locally

Service workers and install prompts require `localhost` or HTTPS; opening `index.html` directly with `file://` will not enable PWA installation or offline caching.

From this folder, start any static HTTP server. For example, with Python installed:

```sh
py -m http.server 8000
```

Then open <http://localhost:8000/>. There is no production build command. Deploy the folder contents to a static host configured for HTTPS.

For Git-connected Netlify deployments, the repository-root `netlify.toml` sets an empty build command and publishes `outputs/recy-light`. It also points Netlify to the existing admin Edge Function, which declares its protected routes in code. These file-based settings override the dashboard build command; the publish folder must not be entered as a shell command. No Python dependency installation is required.

## PWA files and behavior

- `manifest.webmanifest` declares the standalone app, launch URL, colors, and icons.
- `service-worker.js` pre-caches the storefront shell and bundled hero/icon assets. Safe same-origin static assets use cache-first behavior; page navigation is network-first with the cached homepage or `offline.html` as fallback.
- The worker excludes admin/login paths and API paths from all caches and uses network-only requests for them. It does not cache cross-origin product photos, customer information, checkout forms, or payments.
- `pwa.js` handles browser install prompts, the iOS Safari Add to Home Screen guide, and a user-confirmed update/reload.
- `assets/icon-180.png`, `assets/icon-192.png`, and `assets/icon-512.png` are the app icons.
- The offline page only explains connectivity. It does not offer order submission or payment offline.

## Existing storefront features

- Responsive product catalog with product search, categories, sort, stock display, and an accessible product details dialog.
- Cart with quantity controls and local browser persistence.
- Customer accounts use Netlify Identity and checkout enquiries use Netlify Forms. Admin, inventory, reporting and chat interfaces remain preview features; payment processing and confirmed orders are not connected.
- Admin Store settings can hold a public WhatsApp order number. When configured, the cart builds a WhatsApp click-to-chat enquiry for mobile WhatsApp or desktop WhatsApp Web. Customers still need to review and send the message. It is not payment processing or a confirmed order.

## Production requirements still outstanding

- Serve the site over HTTPS. Confirm the deployed scope and correct hosting MIME types for `.webmanifest`, JavaScript, and service worker files.
- Replace browser-only admin and customer account/session behavior with secure server-side authentication and authorization before using real customer or staff data. The current admin gate is not secure access control.
- Connect a backend for live product/stock validation, confirmed order creation/tracking, and verified payment callbacks/webhooks. Customer enquiries are collected separately through Netlify Forms. Do not treat a WhatsApp message or the static checkout preview as a paid or confirmed order.
- Configure the confirmed business WhatsApp number in Admin → Store settings. Because current admin settings are local to one browser, production needs shared server-backed configuration.
- Confirm product catalog, prices, contact information, delivery terms, returns/warranty, and privacy policy before launch.
- Product photography and Google Fonts currently use external URLs; they require connectivity and are intentionally not cached by the service worker.

## PWA smoke checks

1. Serve the site at `http://localhost:8000` or deploy to HTTPS, then open the storefront in Chrome or Edge.
2. Confirm DevTools → Application shows the manifest and active service worker. The **Install app** button appears when the browser reports installation is available. On iPhone/iPad Safari, use **Share → Add to Home Screen**.
3. Load the homepage once, then use DevTools Network → Offline and reload. The cached storefront shell should open. A non-cached page should show the offline page.
4. Verify `/admin.html` and `/login.html` are never in Cache Storage and require a network request. The current browser-only password gate is for preview only and must not protect a production dashboard.
5. Configure a real test WhatsApp number in Store settings, add a cart item, and verify the generated message opens the correct WhatsApp destination without sending automatically. Clear the setting afterward if using a personal test number.
6. Confirm order checkout remains marked as a preview and no payment/order is presented as completed offline.

## Netlify admin route protection

The Netlify Edge Function protects both `/admin.html` and `/login.html` with HTTP Basic Authentication before their browser-side preview gate runs. Before staff access, set the Netlify environment variable `RECYLIGHT_ADMIN_PASSWORD` to a long, unique secret in the site's environment variable settings, then redeploy. The username is `recy-admin`. If the variable is missing, the function returns 503 with setup guidance and keeps the admin content inaccessible. Configure the variable for each deployment context where staff need access, then redeploy. The short URLs `/admin` and `/login` redirect to their protected HTML pages. Do not use the browser-only admin login as production authentication; catalog edits remain local to that browser and there is no shared catalog or real order/report backend.

Deploy the contents of this folder through Netlify Drop or a connected Git deployment. Netlify Drop supports static deploys; confirm the dashboard's deployed functions list includes `admin-auth` after upload. If the Drop workflow does not publish Edge Functions for this site, use a Git-connected Netlify deployment so `netlify.toml` and `netlify/edge-functions/admin-auth.ts` are built and deployed.

## Customer account sign-in

Customer login, signup, recovery, invitations, profile updates, and logout use Netlify Identity. Customer authentication does not fall back to the separate catalog/order API. Identity activation is included with the deployment. New accounts require email confirmation by default; existing external API accounts are not automatically migrated into Identity. Use the Netlify-hosted site or `netlify dev` for sign-in; a plain static local server does not provide the Identity endpoints.

## Order enquiries

The checkout form sends a same-origin, URL-encoded submission to Netlify Forms as `order-enquiry`, including contact and delivery details, cart items, and estimated subtotal. Submitted prices and payment preferences are customer enquiry information, not validated prices or payment confirmation. Staff can review enquiries in the Netlify Forms dashboard after deployment. Email notifications can be configured there. Failed submissions preserve the cart and form fields; successful submissions remove the submitted quantities from the cart. Form detection activation is included with deployment. The external catalog/order API is not used to submit these enquiries.
