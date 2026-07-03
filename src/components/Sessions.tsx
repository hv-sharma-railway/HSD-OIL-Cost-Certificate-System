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
  priceMaster: any[];
}

export const Sessions: React.FC<WorkLogsProps> = ({ sessions, currentSessionId, onLoad, onDelete, onComplete, priceMaster }) => {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
        <History className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No work logs found.</p>
        <p className="text-sm">Save your batch processing progress to see logs here.</p>
      </div>
    );
  }

  const getPriceForShed = (supplyingShed: string, period: string, month: string, year: string, prices: any[]) => {
    const entry = prices.find(p => 
      p.supplying_shed === supplyingShed && 
      p.month === month && 
      p.year === year
    );
    if (!entry) return null;
    return entry.periods[period as keyof typeof entry.periods];
  };

  const calculateAmounts = (shed: any, prices: any[]) => {
    const price = getPriceForShed(shed.supplying_shed, shed.pricing_period, shed.during_month, shed.during_year, prices);
    if (!price) return null;

    const totalLitres = shed.goods_litres + shed.coach_litres;
    const klrs = totalLitres / 1000;

    const primeCost = price.base_price * klrs;
    const excise = price.excise * klrs;
    const vat = price.vat * klrs;
    const overhead = price.overhead * klrs;
    const total = primeCost + excise + vat + overhead;

    return {
      primeCost,
      excise,
      vat,
      overhead,
      total,
      coachPrimeCost: price.base_price * (shed.coach_litres / 1000),
      goodsPrimeCost: price.base_price * (shed.goods_litres / 1000)
    };
  };

  const getSessionTotal = (session: Session, prices: any[]) => {
    const sheds = session.state?.selectedSheds || [];
    return sheds.reduce((sum, s) => {
      const calc = calculateAmounts(s, prices);
      if (!calc) return sum;
      const roundedShedTotal = s.is_power_car
        ? Math.round(calc.primeCost) + Math.round(calc.excise) + Math.round(calc.vat) + Math.round(calc.overhead)
        : Math.round(calc.coachPrimeCost) + Math.round(calc.goodsPrimeCost) + Math.round(calc.excise) + Math.round(calc.vat) + Math.round(calc.overhead);
      return sum + roundedShedTotal;
    }, 0);
  };

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
              session.is_completed ? "border-emerald-200 bg-emerald-50/10" : "border-[#E5E7EB]",
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
              {!session.is_completed && (
                <button 
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    console.log('Finalizing session:', session.id);
                    onComplete(session.id); 
                  }}
                  className="p-3 text-emerald-600 bg-white hover:bg-emerald-50 rounded-2xl transition-all shadow-xl border border-emerald-100 cursor-pointer active:scale-75 hover:scale-110 pointer-events-auto"
                  title="Mark as Completed"
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
                  <p className="text-xs font-bold text-[#1A1A1A]">{session.state.selectedMonth} {session.state.selectedYear}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider mb-1.5">Inventory</p>
                  <p className="text-xs font-bold text-[#1A1A1A]">{session.state.selectedSheds.length} Sheds Added</p>
                </div>
                <div className="col-span-2 bg-[#0052CC]/5 border border-[#0052CC]/10 rounded-2xl px-4 py-3 flex justify-between items-center shadow-sm">
                  <span className="text-[10px] font-black text-[#0052CC] uppercase tracking-wider">Consuming Sheds Cost</span>
                  <span className="text-sm font-black text-[#0052CC]">
                    ₹{getSessionTotal(session, priceMaster).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                {session.is_completed ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Completed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">In Progress</span>
                  </div>
                )}
                
                <div className={cn(
                  "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                  session.is_completed 
                    ? "text-gray-400" 
                    : "text-[#0052CC] group-hover:bg-[#0052CC] group-hover:text-white"
                )}>
                  {session.is_completed ? "Archived" : "Resume"}
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
