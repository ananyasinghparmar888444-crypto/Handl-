import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { ChatMessage, UserRole } from '../types';

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
  const [draft, setDraft] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSendMessage(draft.trim());
    setDraft('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-lg flex flex-col max-h-[82vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Chat with {peerName}
            </div>
            <div className="text-xs text-slate-500">
              Direct job updates · Kanpur
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#F6F7F9]">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No messages yet. Tap a quick reply below or type a message.
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender === currentUserRole;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMine ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed border ${
                      isMine
                        ? 'bg-[#0F2347] text-white border-[#0F2347]'
                        : 'bg-white text-slate-800 border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400 tabular-nums px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3.5 border-t border-slate-200 bg-white space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES[currentUserRole].map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => onSendMessage(reply)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-[#0F2347] hover:text-[#0F2347] text-xs font-medium text-slate-700 transition-colors min-h-[34px]"
              >
                {reply}
              </button>
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
            <button
              type="submit"
              aria-label="Send message"
              className="min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-[#0F2347] hover:bg-[#163161] text-white flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
