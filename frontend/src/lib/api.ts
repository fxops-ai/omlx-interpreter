const API_BASE = 'http://localhost:8001';

export async function uploadAttachment(file: File, chatId: string = 'default') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('chat_id', chatId);

  const res = await fetch(`${API_BASE}/attachments/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function* streamChat(messages: any[], chatId: string = 'default') {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, chatId }),
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch (e) {}
      }
    }
  }
}
