module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;
  const correct = process.env.APP_PASSWORD;

  if (!correct) return res.status(500).json({ ok: false, msg: '서버 설정 오류' });

  if (password === correct) {
    return res.status(200).json({ ok: true });
  } else {
    return res.status(401).json({ ok: false, msg: '비밀번호가 올바르지 않습니다.' });
  }
}
