const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
function setCors(res){ if(ALLOWED_ORIGIN){ res.setHeader("Access-Control-Allow-Origin",ALLOWED_ORIGIN); res.setHeader("Vary","Origin"); } res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers","Content-Type, x-api-key");}
function handleOptions(req,res){ setCors(res); if(req.method==="OPTIONS"){ res.statusCode=204; res.end(); return true;} return false;}
function json(res,status,data){ setCors(res); res.setHeader("Content-Type","application/json; charset=utf-8"); res.status(status).end(JSON.stringify(data));}
function ok(res,d){ json(res,200,d); } function bad(res,m){ json(res,400,{error:m}); } function unauthorized(res,m="Unauthorized"){ json(res,401,{error:m}); } function serverError(res,m="Server error"){ json(res,500,{error:m}); }
const VALID_KEYS=(process.env.VALID_API_KEYS||"").split(",").map(s=>s.trim()).filter(Boolean);
function requireApiKey(req,res){ if(!VALID_KEYS.length) return true; const k=req.headers["x-api-key"]||req.query?.api_key; if(!k||!VALID_KEYS.includes(String(k))){ unauthorized(res,"Invalid or missing API key"); return false;} return true;}
function safeLog(level,...a){ const rank={error:0,warn:1,info:2,debug:3}; const lvl=rank[level]??2, max=rank[LOG_LEVEL]??2; if(lvl<=max) console[level](...a); }
module.exports={json,ok,bad,unauthorized,serverError,requireApiKey,safeLog,handleOptions,setCors};
