// Proxies requests to Flourish's Live API, attaching the API key server-side
// (from the "Flourish" environment variable) so it's never shipped to the browser.
// The client calls /flourish/* (see netlify.toml), which rewrites to this function.

exports.handler = async (event) => {
  const apiKey = process.env.Flourish;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Flourish API key not configured" }),
    };
  }

  const path = event.path.replace(/^(\/\.netlify\/functions)?\/flourish/, "");

  const qs = new URLSearchParams(event.queryStringParameters || {});
  qs.set("api_key", apiKey);

  const targetUrl = `https://flourish-api.com/api/v1/live${path}?${qs.toString()}`;

  const response = await fetch(targetUrl, {
    method: event.httpMethod,
    headers: { "Content-Type": "application/json" },
    body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
  });

  const body = await response.text();

  return {
    statusCode: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    body,
  };
};
