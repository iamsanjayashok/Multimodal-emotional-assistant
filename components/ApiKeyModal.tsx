
import React, { useState } from 'react';

interface ApiKeyModalProps {
  onKeyProvided: () => void;
  hadError: boolean;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeyProvided, hadError }) => {
  const [localApiKey, setLocalApiKey] = useState('');
  const isStudioEnv = !!window.aistudio;

  const handleSaveLocalKey = () => {
    if (localApiKey.trim()) {
      sessionStorage.setItem('gemini-api-key', localApiKey.trim());
      onKeyProvided();
    }
  };

  const handleSelectStudioKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      onKeyProvided();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStudioEnv) {
        handleSaveLocalKey();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 max-w-lg w-full transform transition-all animate-fade-in-up">
        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mb-4">API Key Required</h2>
        {hadError && (
          <p className="text-red-500 dark:text-red-400 mb-4 bg-red-500/10 p-3 rounded-md">
            The provided API key appears to be invalid or has expired. Please provide a new one to continue.
          </p>
        )}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          This application requires a Google AI API key to function. 
          {isStudioEnv 
            ? "Using your own key helps manage usage and prevent quota errors." 
            : "Please enter your key below. It will be stored in your browser's session storage and will not be saved elsewhere."}
        </p>
        
        {!isStudioEnv && (
          <form onSubmit={handleSubmit} className="mb-6">
            <label htmlFor="apiKeyInput" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Your Gemini API Key
            </label>
            <input
              id="apiKeyInput"
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="Enter your API key here"
              className="w-full bg-gray-100 dark:bg-gray-700 rounded-md py-2 px-3 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </form>
        )}
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          For information on billing and quotas, please visit the official documentation: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a>.
        </p>
        
        <div className="flex justify-end">
          {isStudioEnv ? (
            <button
              onClick={handleSelectStudioKey}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
            >
              Select API Key
            </button>
          ) : (
            <button
              onClick={handleSaveLocalKey}
              disabled={!localApiKey.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              Save and Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
