export type Emotion = 'Happy' | 'Sad' | 'Angry' | 'Neutral' | 'Surprised' | 'Calm';
export type FusedEmotion = 'Happy' | 'Sad' | 'Angry' | 'Neutral' | 'Surprised';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export type Theme = 'light' | 'dark';

export interface TTSVoice {
    name: string;
    value: string;
}
