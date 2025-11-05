
import React, { useRef, useEffect } from 'react';
import { ChatMessage, TTSVoice } from '../types';
import { PaperAirplaneIcon, ArrowDownTrayIcon, MicrophoneIcon, SpeakerWaveIcon } from './icons';

interface ChatPanelProps {
  history: ChatMessage[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  isLoadingAudio: boolean;
  onExport: () => void;
  isLive: boolean;
  onToggleLiveSession: () => void;
  inputText: string;
  onInputChange: (value: string) => void;
  voices: TTSVoice[];
  selectedVoice: string;
  onVoiceChange: (value: string) => void;
  mediaError: string | null;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === 'user';
  // Don't render empty AI messages or placeholder dots.
  if (message.sender === 'ai' && (!message.text.trim() || message.text === '...')) {
    return null;
  }
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-cyan-600 text-white rounded-br-none'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
        }`}
      >
        <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
};

const StatusIndicator: React.FC<{ isGenerating: boolean; isLoadingAudio: boolean, isLive: boolean }> = ({ isGenerating, isLoadingAudio, isLive }) => {
    let statusText = '';
    let Icon = null;
  
    if (isLive) {
        statusText = 'Live session active...';
        Icon = <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>;
    } else if (isLoadingAudio) {
      statusText = 'Speaking...';
      Icon = <SpeakerWaveIcon className="h-4 w-4 animate-pulse text-cyan-500 dark:text-cyan-400" />;
    } else if (isGenerating) {
      statusText = 'AI is thinking...';
      Icon = (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      );
    }
  
    if (!statusText) {
      return <div className="h-6 mb-2"></div>; // Placeholder to prevent layout shift
    }
  
    return (
      <div className="h-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
        {Icon}
        <span>{statusText}</span>
      </div>
    );
};


const ChatPanel: React.FC<ChatPanelProps> = ({ 
    history, onSendMessage, isGenerating, isLoadingAudio, onExport, 
    isLive, onToggleLiveSession, inputText, onInputChange, voices, selectedVoice, onVoiceChange, mediaError
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(inputText);
  };

  const getPlaceholder = () => {
    if (isLive) return "Live session is active...";
    if (mediaError) return "An error occurred. Please try again.";
    return "Type or click the mic to talk...";
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">Conversation</h2>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <SpeakerWaveIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <select
                    value={selectedVoice || ''}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-700 rounded-md py-1 px-2 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 max-w-[150px] md:max-w-xs"
                    aria-label="Select voice"
                    disabled={voices.length === 0 || isLive}
                >
                    {voices.length > 0 ? voices.map(voice => (
                    <option key={voice.value} value={voice.value}>
                        {voice.name}
                    </option>
                    )) : <option>No voices available</option>}
                </select>
            </div>
            <button 
              onClick={onExport}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50"
              aria-label="Export chat log"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span className="hidden md:inline">Export Log</span>
            </button>
        </div>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {history.map((msg, index) => (
          <ChatBubble key={index} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <StatusIndicator isGenerating={isGenerating} isLoadingAudio={isLoadingAudio} isLive={isLive} />
        {mediaError && !isLive && <p className="text-red-500 text-center text-sm mb-2">{mediaError}</p>}
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={getPlaceholder()}
            className="flex-grow bg-gray-100 dark:bg-gray-700 rounded-full py-3 px-5 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            disabled={isGenerating || isLive}
            aria-label="Chat input"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLiveSession}
              className={`text-white rounded-full p-3 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed ${
                  isLive 
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse' 
                  : 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500'
              }`}
              disabled={isGenerating || isLoadingAudio}
              aria-label={isLive ? "Stop live session" : "Start live session"}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </button>

            <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-3 transition-colors duration-300 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-cyan-500"
                disabled={isGenerating || isLive || !inputText.trim() || isLoadingAudio}
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
