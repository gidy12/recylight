export default async function adminAuth(request: Request, context: { next: () => Promise<Response> }) {
  const expectedPassword = Netlify.env.get("RECYLIGHT_ADMIN_PASSWORD");

  // Keep access closed while explaining the deployment setup problem.
  if (!expectedPassword) {
    return new Response("Admin access is not configured. The site owner must configure the admin access password in Netlify runtime settings and redeploy. Return to the storefront to continue shopping.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const url = new URL(request.url);
  const page = url.pathname.replace(/\/$/, "");
  if (page === "/admin" || page === "/login") {
    url.pathname = `${page}.html`;
    return new Response(null, {
      status: 302,
      headers: { Location: url.toString(), "Cache-Control": "no-store" },
    });
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Basic ")) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="RecyLight Admin", charset="UTF-8"' },
    });
  }

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (separator < 0 || username !== "recy-admin" || password !== expectedPassword) {
      throw new Error("Invalid credentials");
    }
  } catch {
    return new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="RecyLight Admin", charset="UTF-8"' },
    });
  }

  const response = await context.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  path: ["/admin", "/admin/", "/admin.html", "/login", "/login/", "/login.html"],
};
