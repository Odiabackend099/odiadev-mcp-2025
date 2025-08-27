export default async function handler(req, res) {
  res.status(200).json({ message: "ODIADEV Webhook endpoint ready", status: "configured" });
}
