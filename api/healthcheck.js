const { ok, handleOptions } = require("../lib/utils");
module.exports = async (req,res)=>{ if(handleOptions(req,res)) return;
 ok(res,{ ok:true, service:"ODIADEV MCP Server", domain:"https://mcp.odia.dev", time:new Date().toISOString(), buildTime:"2025-08-26T20:58:36.193855Z", version:"2.1.0", env:{ node:process.version, ttsConfigured:Boolean(process.env.ODIA_TTS_BASE_URL)||false, flwConfigured:Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_SECRET_HASH)||false } }); };
