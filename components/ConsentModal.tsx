import React from 'react';

interface ConsentModalProps {
  onConsent: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ onConsent }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 max-w-lg w-full transform transition-all animate-fade-in-up">
        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mb-4">Privacy and Consent</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          This application requires access to your camera and microphone to analyze facial and vocal expressions for emotion detection. 
          All processing is designed to happen locally in your browser where possible. No video or audio is stored or sent to a server for this prototype.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <ul className="list-disc list-inside space-y-2">
            <li>We use your camera to detect facial emotions.</li>
            <li>We use your microphone to detect vocal tone.</li>
            <li>Text you type is sent to a generative AI to provide a response.</li>
          </ul>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">
            By clicking "I Agree", you consent to the use of your camera and microphone for the duration of your session.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onConsent}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;