import React from 'react';
import { 
  History, 
  Trash2, 
  Play, 
  CheckCircle2,
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

interface WorkLogsProps {
  sessions: Session[];
  currentSessionId: string | null;
  onLoad: (session: Session) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

export const Sessions: React.FC<WorkLogsProps> = ({ sessions, currentSessionId, onLoad, onDelete, onComplete }) => {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
        <History className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No work logs found.</p>
        <p className="text-sm">Save your batch processing progress to see logs here.</p>
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
            className={cn(
              "bg-white border rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 relative group",
              session.status === 'APPROVED' ? "border-emerald-200 bg-emerald-50/10" : 
              session.status === 'PENDING' ? "border-amber-200 bg-amber-50/10" :
              session.status === 'REJECTED' ? "border-red-200 bg-red-50/10" :
              "border-[#E5E7EB]",
              currentSessionId === session.id && "border-[#0052CC] ring-2 ring-[#0052CC]/10"
            )}
          >
            {currentSessionId === session.id && (
              <div className="absolute -top-3 -right-3 bg-[#0052CC] text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-50 animate-bounce">
                ACTIVE
              </div>
            )}
            {/* Action Buttons - Ensure they are above everything */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-[100]">
              {(session.status === 'DRAFT' || session.status === 'REJECTED') && (
                <button 
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onComplete(session.id); 
                  }}
                  className="p-3 text-emerald-600 bg-white hover:bg-emerald-50 rounded-2xl transition-all shadow-xl border border-emerald-100 cursor-pointer active:scale-75 hover:scale-110 pointer-events-auto"
                  title="Submit for Approval"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  console.log('Deleting session:', session.id);
                  onDelete(session.id); 
                }}
                className="p-3 text-red-500 bg-white hover:bg-red-50 rounded-2xl transition-all shadow-xl border border-red-100 cursor-pointer active:scale-75 hover:scale-110 pointer-events-auto"
                title="Delete Work Log"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Clickable Content area */}
            <div 
              onClick={() => onLoad(session)}
              className={cn(
                "p-6 flex flex-col h-full cursor-pointer"
              )}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className={cn(
                  "p-3 rounded-2xl",
                  session.is_completed ? "bg-emerald-500/10 text-emerald-600" : "bg-[#0052CC]/10 text-[#0052CC]"
                )}>
                  <Clock className="w-5 h-5" />
                </div>
                <div className="pr-16"> {/* Space for absolute buttons */}
                  <h3 className="font-bold text-lg text-[#1A1A1A] leading-tight line-clamp-1">{session.name}</h3>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.1em] flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3 h-3" />
                    Updated {formatDate(session.updated_at)}
                  </p>
                </div>
              </div>

              {session.description && (
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 mb-5 flex gap-3">
                  <MessageSquare className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed italic">"{session.description}"</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider mb-1.5">Period</p>
                  <p className="text-xs font-bold text-[#1A1A1A]">{session.month} {session.year}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider mb-1.5">Inventory</p>
                  <p className="text-xs font-bold text-[#1A1A1A]">{session.data?.selectedSheds?.length || 0} Sheds</p>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                {session.status === 'APPROVED' ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Approved</span>
                  </div>
                ) : session.status === 'PENDING' ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending Approval</span>
                  </div>
                ) : session.status === 'REJECTED' ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Rejected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Draft</span>
                  </div>
                )}
                
                <div className={cn(
                  "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                  (session.status !== 'DRAFT' && session.status !== 'REJECTED')
                    ? "text-gray-400" 
                    : "text-[#0052CC] group-hover:bg-[#0052CC] group-hover:text-white"
                )}>
                  {(session.status !== 'DRAFT' && session.status !== 'REJECTED') ? "View Only" : "Resume"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
