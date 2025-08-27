export default async function handler(req, res) {
  res.status(200).json({ message: "ODIADEV TTS endpoint ready", status: "configured" });
}
