import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Send, X } from 'lucide-react';
import { ChatMessage, UserRole } from '../types';
import { EASE_OUT_EXPO, PulsingLiveDot } from './TradeVisuals';

interface JobChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
  peerName: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

const QUICK_REPLIES: Record<UserRole, string[]> = {
  household: [
    "I'm outside",
    'Please call',
    'Gate is open, come up',
    'How many minutes away?',
  ],
  worker: [
    "I'm outside",
    'Please call',
    'On my way, 5 mins away',
    'Reached your lane',
  ],
};

export const JobChatDrawer: React.FC<JobChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  peerName,
  messages,
  onSendMessage,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSendMessage(draft.trim());
    setDraft('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="chat-backdrop"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#0F2347]/35 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            key="chat-sheet"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.26, ease: EASE_OUT_EXPO }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white/95 backdrop-blur-xl border border-white/95 rounded-t-2xl sm:rounded-2xl shadow-[0_24px_60px_-15px_rgba(15,35,71,0.3)] flex flex-col max-h-[82vh] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200/80 bg-white/80 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <PulsingLiveDot />
                  <div className="text-sm font-semibold text-slate-900">
                    Chat with {peerName}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Direct job updates · Kanpur
                </div>
              </div>
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                onClick={onClose}
                aria-label="Close chat"
                className="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gradient-to-b from-[#F7F6FC] to-[#F2FAF7]">
              {messages.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No messages yet. Tap a quick reply below or type a message.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender === currentUserRole;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                      className={`flex flex-col ${
                        isMine ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed border shadow-xs ${
                          isMine
                            ? 'bg-[#0F2347] text-white border-[#0F2347]'
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="mt-1 text-[10px] text-slate-500 tabular-nums px-1">
                        {msg.timestamp}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 border-t border-slate-200/80 bg-white space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES[currentUserRole].map((reply) => (
                  <motion.button
                    key={reply}
                    type="button"
                    whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                    onClick={() => onSendMessage(reply)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-[#F6F5FC] hover:border-[#EA580C] hover:bg-orange-50/50 hover:text-[#C2410C] text-xs font-medium text-slate-700 transition-colors min-h-[34px]"
                  >
                    {reply}
                  </motion.button>
                ))}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 min-h-[44px] px-3.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2347]"
                />
                <motion.button
                  type="submit"
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                  aria-label="Send message"
                  className="min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white flex items-center justify-center transition-colors shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
