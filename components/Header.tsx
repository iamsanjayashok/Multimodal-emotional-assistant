import React from 'react';
import { BrainCircuitIcon } from './icons';
import ThemeSwitcher from './ThemeSwitcher';
import { Theme } from '../types';

interface HeaderProps {
    theme: Theme;
    onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
  return (
    <header className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm shadow-md p-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
            <BrainCircuitIcon className="h-8 w-8 text-cyan-500 dark:text-cyan-400 mr-3" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Multimodal Emotional Assistant
            </h1>
        </div>
        <ThemeSwitcher theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
};

export default Header;