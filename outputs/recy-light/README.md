# RecyLight Ltd storefront preview and PWA

This is a dependency-free static storefront hosted on Vercel and connected to the RecyLight API at `https://recylight-api.onrender.com`. It has no package manager or build step. The PWA enhancement adds an installable storefront shell and an offline information page without caching customer or admin data.

## Run locally

Service workers and install prompts require `localhost` or HTTPS; opening `index.html` directly with `file://` will not enable PWA installation or offline caching.

From this folder, start any static HTTP server. For example, with Python installed:

```sh
py -m http.server 8000
```

Then open <http://localhost:8000/>. There is no production build command. Deploy the folder contents to a static host configured for HTTPS.

## PWA files and behavior

- `manifest.webmanifest` declares the standalone app, launch URL, colors, and icons.
- `service-worker.js` pre-caches the storefront shell and bundled hero/icon assets. Safe same-origin static assets use cache-first behavior; page navigation is network-first with the cached homepage or `offline.html` as fallback.
- The worker excludes admin/login paths and API paths from all caches and uses network-only requests for them. It does not cache cross-origin product photos, customer information, checkout forms, or payments.
- `pwa.js` handles browser install prompts, the iOS Safari Add to Home Screen guide, and a user-confirmed update/reload.
- `assets/icon-180.png`, `assets/icon-192.png`, and `assets/icon-512.png` are the app icons.
- The offline page only explains connectivity. It does not offer order submission or payment offline.

## Existing storefront features

- Responsive product catalog loaded from the public API (`/api/v1/catalog/products` and `/api/v1/catalog/products/:slug`) with API-provided categories, search, sorting, stock display, product details, loading/error/retry states, and a real empty state. There is no sample or local-storage product inventory.
- Cart with quantity controls and local browser persistence.
- Customer and administrator authentication use the Render API and cookie-based sessions. The browser sends API requests with credentials enabled.
- Admin products and categories use the authenticated `/api/v1/admin/products` and `/api/v1/admin/categories` APIs. Product creation and edits refresh the admin list; publication state is saved as `DRAFT`, `PUBLISHED`, or `ARCHIVED`.
- Checkout creates orders with `POST /api/v1/orders`. MTN Mobile Money orders open a dedicated instructions page using the actual order total and identifier. Submitting a transaction reference uses `POST /api/v1/payments/manual`; payment is not marked paid by the storefront. Administrators review `GET /api/v1/payments/admin/pending` and verify through `PATCH /api/v1/payments/:paymentId/verify`.
- `api.js` centralizes the API base URL. On Vercel, API requests use the same-origin rewrite to Render for cookie sessions; set `window.RECYLIGHT_API_BASE_URL` before loading `api.js` only when deploying with a different API origin.
- Admin product photos can be selected as local files; the browser resizes them and uploads them to `POST /api/v1/admin/uploads` as multipart field `file`. The endpoint must return a hosted image URL (for example, `{ "data": { "url": "https://..." } }`), which is then saved with the product. Set `window.RECYLIGHT_ADMIN_IMAGE_UPLOAD_PATH` before `api.js` loads if the backend uses a different route.
- Admin product and category changes use the API, including hosted product photos. Store settings remain local to the current browser.
- Admin Store settings can hold a public WhatsApp order number. When configured, the cart builds a WhatsApp click-to-chat enquiry for mobile WhatsApp or desktop WhatsApp Web. Customers still need to review and send the message. It is not payment processing or a confirmed order.

## Production requirements still outstanding

- Serve the site over HTTPS. Confirm the deployed scope and correct hosting MIME types for `.webmanifest`, JavaScript, and service worker files.
- Set the Render `FRONTEND_ORIGIN` to the exact Vercel origin and allow credentialed CORS requests. Test session cookies in production: Vercel and Render are cross-site, so `SameSite=Strict` cookies may not be sent by browsers; configure compatible cookie attributes or use a shared-site custom domain.
- Ensure the deployed catalogue endpoint and database are healthy. The storefront intentionally shows an error and retry control rather than sample products if the API is unavailable.
- Verify payment confirmation email behavior in the backend. The storefront does not claim that an email was sent; the backend must trigger and report delivery when an administrator verifies a payment.
- Configure the confirmed business WhatsApp number in Admin → Store settings. Because current admin settings are local to one browser, production needs shared server-backed configuration.
- Confirm product catalog, prices, contact information, delivery terms, returns/warranty, and privacy policy before launch.
- Product photography and Google Fonts currently use external URLs; they require connectivity and are intentionally not cached by the service worker.

## PWA smoke checks

1. Serve the site at `http://localhost:8000` or deploy to HTTPS, then open the storefront in Chrome or Edge.
2. Confirm DevTools → Application shows the manifest and active service worker. The **Install app** button appears when the browser reports installation is available. On iPhone/iPad Safari, use **Share → Add to Home Screen**.
3. Load the homepage once, then use DevTools Network → Offline and reload. The cached storefront shell should open. A non-cached page should show the offline page.
4. Verify `/admin.html` and `/login.html` are never in Cache Storage and require a network request. Confirm the admin page redirects when the API session is absent.
5. Configure a real test WhatsApp number in Store settings, add a cart item, and verify the generated message opens the correct WhatsApp destination without sending automatically. Clear the setting afterward if using a personal test number.
6. Confirm API-backed order submission and payment instructions require a network connection. Offline mode must never submit an order or present a payment as completed.
