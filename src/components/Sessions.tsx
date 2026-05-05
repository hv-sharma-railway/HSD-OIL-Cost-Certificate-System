import React from 'react';
import { 
  History, 
  Trash2, 
  Play, 
  Calendar, 
  Building2, 
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '../types';
import { cn } from '../utils';

interface SessionsProps {
  sessions: Session[];
  onLoad: (session: Session) => void;
  onDelete: (id: string) => void;
}

export const Sessions: React.FC<SessionsProps> = ({ sessions, onLoad, onDelete }) => {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
        <History className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No saved sessions yet.</p>
        <p className="text-sm">Save your progress after adding sheds to see them here.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
      <AnimatePresence>
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  if (window.confirm('Delete this session?')) {
                    onDelete(session.id);
                  }
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#0052CC]/10 p-2.5 rounded-xl text-[#0052CC]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1A1A1A] line-clamp-1">{session.name}</h3>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    Updated {formatDate(session.updated_at)}
                  </p>
                </div>
              </div>

              {session.description && (
                <div className="bg-[#F9FAFB] rounded-xl p-3 mb-4 flex gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#6B7280] line-clamp-2 italic">"{session.description}"</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#F3F4F6] rounded-xl p-3">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Period</p>
                  <p className="text-xs font-bold text-[#1A1A1A]">{session.state.selectedMonth} {session.state.selectedYear}</p>
                </div>
                <div className="bg-[#F3F4F6] rounded-xl p-3">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Sheds</p>
                  <p className="text-xs font-bold text-[#1A1A1A]">{session.state.selectedSheds.length} Added</p>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Progress Saved</span>
                </div>
                <button
                  onClick={() => onLoad(session)}
                  className="bg-[#0052CC] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#0052CC]/10 hover:shadow-[#0052CC]/20 hover:scale-[1.02] transition-all flex items-center gap-2 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
