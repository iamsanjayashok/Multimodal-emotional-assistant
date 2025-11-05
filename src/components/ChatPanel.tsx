import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { PaperAirplaneIcon, ArrowDownTrayIcon, SpeakerWaveIcon, MicrophoneIcon } from './icons';

interface ChatPanelProps {
  history: ChatMessage[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  isLoadingAudio: boolean;
  onExport: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-cyan-600 text-white rounded-br-none'
            : 'bg-gray-700 text-gray-200 rounded-bl-none'
        }`}
      >
        <p className="text-sm break-words">{message.text}</p>
      </div>
    </div>
  );
};


const ChatPanel: React.FC<ChatPanelProps> = ({ history, onSendMessage, isGenerating, isLoadingAudio, onExport, isRecording, onToggleRecording }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-cyan-400">Conversation</h2>
        <button 
          onClick={onExport}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-gray-700"
          aria-label="Export chat log"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export Log
        </button>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {history.map((msg, index) => (
          <ChatBubble key={index} message={msg} />
        ))}
         {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? "Recording... Speak now" : "Type your message..."}
            className="flex-grow bg-gray-700 rounded-full py-3 px-5 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            disabled={isGenerating || isRecording}
            aria-label="Chat input"
          />
          <div className="relative flex items-center gap-2">
            {isLoadingAudio && <div className="absolute -left-20 flex items-center gap-1 text-xs text-gray-400"><SpeakerWaveIcon className="h-4 w-4 animate-pulse text-cyan-400" /> Speaking...</div>}
            
            <button
              type="button"
              onClick={onToggleRecording}
              className={`text-white rounded-full p-3 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed ${
                  isRecording 
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              disabled={isGenerating}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </button>

            <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-3 transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500"
                disabled={isGenerating || isRecording || !inputText.trim()}
                aria-label="Send message"
            >
                <PaperAirplaneIcon className="h-6 w-6" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
