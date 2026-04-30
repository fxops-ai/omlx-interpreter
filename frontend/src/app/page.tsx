'use client';

import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      setAttachments(prev => [...prev, {
        name: file.name,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }]);
    });
    // TODO: Upload to backend
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: input,
      attachments: [...attachments]
    }]);

    // TODO: Call backend with attachments

    setInput('');
    setAttachments([]);
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-800 p-4 overflow-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          oMLX-Interpreter
        </h1>
        <button className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-xl mb-8">
          + New Chat
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col" {...getRootProps()}>
        <input {...getInputProps()} />
        
        <div className="flex-1 overflow-auto p-8 space-y-8">
          {isDragActive && (
            <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center text-3xl font-medium z-10">
              Drop files here (PDF, JSON, MD, PNG, JPEG)
            </div>
          )}

          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-500">
              Drop files or type a message to begin
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-800'} rounded-3xl px-6 py-4`}>
                {msg.content && <p>{msg.content}</p>}
                {msg.attachments?.map((att: any, j: number) => (
                  <div key={j} className="mt-3 text-sm opacity-75">
                    📎 {att.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500"
              placeholder="Type message or drag & drop files..."
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="bg-white text-black px-10 rounded-2xl font-semibold hover:bg-gray-200 transition"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            Supports PDF, JSON, Markdown, PNG, JPEG + paste
          </p>
        </div>
      </div>
    </div>
  );
}
