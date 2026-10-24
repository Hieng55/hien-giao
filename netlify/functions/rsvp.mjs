const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) {
    return json({ error: 'Dữ liệu quá lớn' }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Dữ liệu không hợp lệ' }, 400);
  }

  // Honeypot: accept silently so automated submissions do not retry.
  if (String(payload.website || '').trim()) return json({ ok: true });

  const name = String(payload.name || '').trim().slice(0, 100);
  const choice = String(payload.choice || '').trim();
  const guests = String(payload.guests || '').trim();
  const allowedChoices = new Set(['Có', 'Không']);
  const allowedGuests = new Set(['1', '2', '3', '4']);

  if (!name || !allowedChoices.has(choice) || !allowedGuests.has(guests)) {
    return json({ error: 'Thông tin xác nhận không hợp lệ' }, 400);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return json({ error: 'Dịch vụ nhận tin chưa được cấu hình' }, 503);
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
      return json({ error: 'Telegram không nhận được tin nhắn' }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('Telegram request failed', error);
    return json({ error: 'Không thể kết nối Telegram' }, 502);
  }
}

export const config = { path: '/api/rsvp' };
