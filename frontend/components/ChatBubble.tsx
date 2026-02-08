'use client';

import { motion } from 'framer-motion';
import type { ChatMessage } from '@/types/game';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export default function ChatBubble({ message, isOwnMessage }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1"
        style={{ backgroundColor: message.avatar }}
      >
        {message.playerName.charAt(0).toUpperCase()}
      </div>
      <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className="text-xs text-gray-500 mb-1 px-1">{message.playerName}</span>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwnMessage
              ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 text-gray-100'
              : 'bg-white/5 border border-white/5 text-gray-200'
          }`}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
