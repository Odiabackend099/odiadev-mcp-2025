const { ok, bad, serverError, requireApiKey, safeLog, handleOptions } = require("../../lib/utils");
const { z } = require("zod");
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "";
const schema = z.object({ amount:z.number().positive(), currency:z.string().default("NGN"), customer:z.object({email:z.string().email(), name:z.string().min(2)}), tx_ref:z.string().min(6), redirect_url:z.string().url().optional(), meta:z.record(z.any()).optional() });
module.exports = async (req,res)=>{ if(handleOptions(req,res)) return; if(req.method!=="POST") return res.status(405).end("Method Not Allowed"); if(!requireApiKey(req,res)) return; if(!FLW_SECRET_KEY) return serverError(res,"FLW_SECRET_KEY not configured");
 try{ const parsed=schema.safeParse(req.body||{}); if(!parsed.success) return bad(res,parsed.error.message);
 const payload={ amount:parsed.data.amount, currency:parsed.data.currency, tx_ref:parsed.data.tx_ref, customer:parsed.data.customer, redirect_url:parsed.data.redirect_url, meta:parsed.data.meta||{} };
 const fwRes = await fetch("https://api.flutterwave.com/v3/payments",{ method:"POST", headers:{ "Content-Type":"application/json","Authorization":`Bearer ${FLW_SECRET_KEY}` }, body:JSON.stringify(payload) });
 const body = await fwRes.json().catch(()=>({})); if(!fwRes.ok){ safeLog("warn","Flutterwave initiate failed",body); return serverError(res, body?.message || "Flutterwave error"); }
 ok(res,{ link: body?.data?.link, id: body?.data?.id, status: body?.status }); }
 catch(err){ safeLog("error","payments/initiate error",err); serverError(res); } };
