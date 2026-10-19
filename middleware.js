export const config = {
  matcher: ["/((?!api/|login\.html|src/|assets/|favicon).*)"],
};

export default async function middleware(request) {
  const token = (request.headers.get("cookie") || "").match(/(?:^|;\s*)flex_session=([^;]+)/)?.[1];
  if (token) {
    const r = await fetch((process.env.API_URL || "https://dev.api.ktng.bybyte.dev/site") + "/api/v1/cabinet/me", {
      headers: { "X-Site-Key": process.env.SITE_KEY || "", Authorization: "Bearer " + token },
    });
    if (r.ok) return;
  }
  return Response.redirect(new URL("/login.html", request.url), 307);
}
