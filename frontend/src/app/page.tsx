'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadAttachment, streamChat } from '../lib/api';

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const result = await uploadAttachment(file);
      setPendingAttachments(prev => [...prev, { ...result, file }]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/markdown': ['.md'],
      'text/plain': ['.txt']
    }
  });

  const sendMessage = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input || "Attached files",
      attachments: [...pendingAttachments]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentAttachments = [...pendingAttachments];
    setPendingAttachments([]);
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      let assistantMessage = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      for await (const chunk of streamChat(apiMessages)) {
        if (chunk.delta) {
          assistantMessage.content += chunk.delta;
          setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
        }
      }
    } catch (error) {
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-800 p-4">
        <h1 className="text-2xl font-bold mb-6">oMLX-Interpreter</h1>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-xl mb-8 font-medium"
        >
          + New Chat
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col" {...getRootProps()}>
        <input {...getInputProps()} />

        <div className="flex-1 p-8 overflow-auto space-y-8">
          {isDragActive && (
            <div className="fixed inset-0 bg-blue-600/40 flex items-center justify-center text-4xl z-50 pointer-events-none">
              Drop files here
            </div>
          )}

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p className="text-2xl mb-4">Ready to work locally</p>
              <p>Drag & drop files or type a message</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl rounded-3xl px-6 py-5 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-800'}`}>
                <p>{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {msg.attachments.map((att: any, j: number) => (
                      <div key={j} className="text-xs bg-black/30 px-3 py-1 rounded-full">
                        📎 {att.filename}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-800">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message oMLX-Interpreter... (or drag files)"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="bg-white text-black px-10 rounded-2xl font-semibold hover:bg-gray-100"
            >
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
