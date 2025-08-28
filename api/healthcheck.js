const CORS_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    ok: true,
    service: "ODIADEV MCP Server",
    version: "4.0.0",
    time: new Date().toISOString(),
    domain: "mcp.odia.dev",
    build: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    env: {
      node: process.version,
      platform: process.platform,
      runtime: "vercel-node"
    },
    status: "operational"
  });
};

// Test execution
if (require.main === module) {
  const mockReq = { method: "GET", headers: {} };
  const mockRes = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => console.log(code + ":", JSON.stringify(data, null, 2)),
      end: () => console.log(code + ": End")
    })
  };
  module.exports(mockReq, mockRes);
}
