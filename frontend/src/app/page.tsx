'use client';

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    // TODO: Upload to /api/attachments
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const sendMessage = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    
    // TODO: Call backend /api/chat
    
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-800 p-4">
        <h1 className="text-xl font-bold mb-8">oMLX-Interpreter</h1>
        <div className="text-sm text-gray-400">New Chat</div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-8" {...getRootProps()}>
          <input {...getInputProps()} />
          <p className="text-center text-gray-500 mb-8">Drop PDF, JSON, MD, PNG, JPEG or paste here</p>
          
          {messages.map((msg, i) => (
            <div key={i} className={`mb-6 ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block max-w-lg p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-800'}`}>
                {msg.content}
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
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-6 py-4 focus:outline-none"
              placeholder="Message oMLX-Interpreter..."
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="bg-white text-black px-8 rounded-xl font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
