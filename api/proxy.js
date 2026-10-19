module.exports = async (req, res) => {
  const { path = "", ...query } = req.query;
  const qs = new URLSearchParams(query).toString();
  const url = (process.env.API_URL || "https://dev.api.ktng.bybyte.dev/site") + "/api/v1/" + [].concat(path).join("/") + (qs ? "?" + qs : "");

  const headers = { Accept: "application/json", "X-Site-Key": process.env.SITE_KEY || "" };
  ["content-type", "authorization", "accept-language"].forEach((h) => {
    if (req.headers[h]) headers[h] = req.headers[h];
  });

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {})) : undefined;

  try {
    const r = await fetch(url, { method: req.method, headers, body });
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ detail: "API недоступно", code: "PROXY_ERROR" });
  }
};
