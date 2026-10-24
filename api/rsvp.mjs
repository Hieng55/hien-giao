const sendJson = (response, status, body) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > 4096) {
    return sendJson(response, 413, { error: 'Dữ liệu quá lớn' });
  }

  let payload;
  try {
    payload = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;
  } catch {
    return sendJson(response, 400, { error: 'Dữ liệu không hợp lệ' });
  }

  if (!payload || typeof payload !== 'object') {
    return sendJson(response, 400, { error: 'Dữ liệu không hợp lệ' });
  }

  // Honeypot: accept silently so automated submissions do not retry.
  if (String(payload.website || '').trim()) {
    return sendJson(response, 200, { ok: true });
  }

  const name = String(payload.name || '').trim().slice(0, 100);
  const choice = String(payload.choice || '').trim();
  const guests = String(payload.guests || '').trim();
  const allowedChoices = new Set(['Có', 'Không']);
  const allowedGuests = new Set(['1', '2', '3', '4']);

  if (!name || !allowedChoices.has(choice) || !allowedGuests.has(guests)) {
    return sendJson(response, 400, { error: 'Thông tin xác nhận không hợp lệ' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return sendJson(response, 503, { error: 'Dịch vụ nhận tin chưa được cấu hình' });
  }

  const attending = choice === 'Có';
  const submittedAt = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(new Date());
  const message = [
    '💌 XÁC NHẬN THAM DỰ MỚI',
    '',
    `👤 Họ tên: ${name}`,
    `${attending ? '✅' : '❌'} Tham dự: ${attending ? 'Có' : 'Không'}`,
    `👥 Số khách: ${guests}`,
    `🕒 Gửi lúc: ${submittedAt}`
  ].join('\n');

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
    const telegramResult = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error('Telegram API error', telegramResponse.status, telegramResult.description || 'Unknown error');
      return sendJson(response, 502, { error: 'Telegram không nhận được tin nhắn' });
    }

    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error('Telegram request failed', error);
    return sendJson(response, 502, { error: 'Không thể kết nối Telegram' });
  }
}
