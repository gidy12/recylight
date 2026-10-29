export default async function adminAuth(request: Request, context: { next: () => Promise<Response> }) {
  const expectedPassword = Netlify.env.get("RECYLIGHT_ADMIN_PASSWORD");

  // Fail closed if the deployment has not been configured yet.
  if (!expectedPassword) {
    return new Response("Not found", { status: 404 });
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

  return context.next();
}
