import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TextToSpeechButtonProps {
  text: string;
  className?: string;
}

export const TextToSpeechButton: React.FC<TextToSpeechButtonProps> = ({ text, className = '' }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    // If already speaking, cancel
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9; // Slow and clear for kids
    utterance.pitch = 1.1; // Cheerful friendly pitch

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title={isSpeaking ? 'Dừng đọc' : 'Bấm để nghe đọc đề bài'}
      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
        isSpeaking
          ? 'bg-amber-100 text-amber-700 animate-pulse ring-2 ring-amber-300'
          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
      } ${className}`}
    >
      <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
    </button>
  );
};

export default TextToSpeechButton;
