import React from 'react';
import { Emotion, FusedEmotion } from '../types';
import { FaceSmileIcon, MicrophoneIcon, SparklesIcon } from './icons';

interface EmotionDisplayProps {
  facialEmotion: Emotion;
  vocalEmotion: Emotion;
  fusedEmotion: FusedEmotion;
  isActive: boolean;
}

const EmotionTag: React.FC<{ icon: React.ReactNode; label: string; value: string; }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 bg-gray-200/50 dark:bg-gray-700/50 p-3 rounded-lg">
        {icon}
        <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <div className="font-semibold text-lg text-gray-900 dark:text-white h-7 flex items-center">
              <p>{value}</p>
            </div>
        </div>
    </div>
);

const AudioWaveform: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <div className="flex items-center justify-center h-16 bg-gray-200/30 dark:bg-gray-700/30 rounded-lg overflow-hidden">
        {isActive ? (
             <div className="flex items-center justify-center gap-1 w-full h-full">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-wave"
                        style={{
                            height: `${Math.random() * 80 + 10}%`,
                            animationDelay: `${i * 0.05}s`,
                        }}
                    ></div>
                ))}
            </div>
        ) : (
            <p className="text-gray-500 text-sm">Mic Inactive</p>
        )}
        <style>{`
            @keyframes wave {
                0%, 100% { transform: scaleY(0.2); }
                50% { transform: scaleY(1); }
            }
            .animate-wave {
                animation: wave 1.5s ease-in-out infinite;
            }
        `}</style>
    </div>
);


const EmotionDisplay: React.FC<EmotionDisplayProps> = ({ facialEmotion, vocalEmotion, fusedEmotion, isActive }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Emotion Analysis</h2>
      <div className="space-y-3">
        <EmotionTag 
            icon={<FaceSmileIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />} 
            label="Facial Emotion" 
            value={isActive ? facialEmotion : 'N/A'} 
        />
        <EmotionTag icon={<MicrophoneIcon className="h-8 w-8 text-green-500 dark:text-green-400" />} label="Vocal Emotion" value={isActive ? vocalEmotion : 'N/A'} />
        <AudioWaveform isActive={isActive} />
        <div className="pt-2">
            <EmotionTag icon={<SparklesIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />} label="Fused Mood" value={isActive ? fusedEmotion : 'N/A'} />
        </div>
      </div>
    </div>
  );
};

export default EmotionDisplay;