import React from 'react';
import { VideoCameraIcon, VideoCameraSlashIcon } from './icons';

interface SessionControlProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const SessionControl: React.FC<SessionControlProps> = ({ isActive, onToggle, disabled }) => {
  const Icon = isActive ? VideoCameraSlashIcon : VideoCameraIcon;
  let text = isActive ? 'End Session' : 'Start Session';
  if (disabled && !isActive) {
      text = 'Loading AI...';
  }
  const bgColor = isActive ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500';
  const disabledClasses = 'disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-wait';

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-white ${bgColor} ${disabledClasses}`}
    >
      <Icon className="h-6 w-6" />
      <span>{text}</span>
    </button>
  );
};

export default SessionControl;