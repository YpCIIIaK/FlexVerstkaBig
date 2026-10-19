module.exports = async (req, res) => {
  const { path = "", ...query } = req.query;
  const route = [].concat(path).join("/");
  const cookie = (token, age) => `flex_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;

  if (route === "logout") {
    res.setHeader("Set-Cookie", cookie("", 0));
    return res.status(204).end();
  }

  const qs = new URLSearchParams(query).toString();
  const url = (process.env.API_URL || "https://dev.api.ktng.bybyte.dev/site") + "/api/v1/" + route + (qs ? "?" + qs : "");

  const headers = { Accept: "application/json", "X-Site-Key": process.env.SITE_KEY || "" };
  ["content-type", "authorization", "accept-language"].forEach((h) => {
    if (req.headers[h]) headers[h] = req.headers[h];
  });

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {})) : undefined;

  try {
    const r = await fetch(url, { method: req.method, headers, body });
    const data = Buffer.from(await r.arrayBuffer());
    if (route === "cabinet/session" && r.ok) res.setHeader("Set-Cookie", cookie(JSON.parse(data).token, 86400));
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    res.send(data);
  } catch (e) {
    res.status(502).json({ detail: "API недоступно", code: "PROXY_ERROR" });
  }
};
