// src/lib/api.ts
export const uploadAttachment = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/attachments/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

// No more streamChat needed — WebSocket handles everything