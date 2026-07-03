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
  ChevronLeft,
  MoreVertical,
  Clock,
  LayoutGrid,
  List
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

  // State for View Mode and Pagination
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [page, setPage] = React.useState(1);
  const itemsPerPage = 6;

  const totalPages = Math.max(1, Math.ceil(sessions.length / itemsPerPage));

  // Sync page if it somehow gets out of bounds (e.g. after deletion)
  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [sessions.length, totalPages, page]);

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

  const startIndex = (page - 1) * itemsPerPage;
  const paginatedSessions = sessions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 pb-12">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div className="text-xs font-semibold text-[#6B7280]">
          Showing <span className="font-bold text-[#1A1A1A]">{startIndex + 1} - {Math.min(startIndex + itemsPerPage, sessions.length)}</span> of <span className="font-bold text-[#1A1A1A]">{sessions.length}</span> work logs
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Grid / List toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase",
                viewMode === 'grid' ? "bg-white text-[#0052CC] shadow-sm" : "text-[#6B7280] hover:text-[#1A1A1A]"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase",
                viewMode === 'list' ? "bg-white text-[#0052CC] shadow-sm" : "text-[#6B7280] hover:text-[#1A1A1A]"
              )}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content (Grid vs List) */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {paginatedSessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-white border rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 relative group flex flex-col h-full",
                  session.is_completed ? "border-emerald-200 bg-emerald-50/10" : "border-[#E5E7EB]",
                  currentSessionId === session.id && "border-[#0052CC] ring-2 ring-[#0052CC]/10"
                )}
              >
                {currentSessionId === session.id && (
                  <div className="absolute -top-3 -right-3 bg-[#0052CC] text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-50 animate-bounce">
                    ACTIVE
                  </div>
                )}
                {/* Action Buttons */}
                <div className="absolute top-6 right-6 flex items-center gap-2 z-[100]">
                  {!session.is_completed && (
                    <button 
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
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
                  className="p-6 flex flex-col flex-grow cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      session.is_completed ? "bg-emerald-500/10 text-emerald-600" : "bg-[#0052CC]/10 text-[#0052CC]"
                    )}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="pr-16">
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

                  <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
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

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
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
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F9FAFB] text-[#6B7280] text-[10px] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Work Log Name</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Sheds Added</th>
                    <th className="px-6 py-4 text-right">Total Cost</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {paginatedSessions.map((session) => {
                    const totalCost = getSessionTotal(session, priceMaster);
                    const isCurrentActive = currentSessionId === session.id;
                    return (
                      <tr 
                        key={session.id} 
                        className={cn(
                          "hover:bg-[#F9FAFB] transition-all group cursor-pointer",
                          isCurrentActive && "bg-[#0052CC]/5"
                        )}
                        onClick={() => onLoad(session)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {session.is_completed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Draft
                              </span>
                            )}
                            {isCurrentActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-[#0052CC] text-white">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={cn("text-[#1A1A1A] font-bold text-sm", isCurrentActive && "text-[#0052CC]")}>{session.name}</span>
                            {session.description && (
                              <span className="text-[11px] text-gray-400 font-medium line-clamp-1 mt-0.5 italic">"{session.description}"</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-600">
                          {session.state.selectedMonth} {session.state.selectedYear}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-lg border border-gray-200 inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-500" />
                            {session.state.selectedSheds.length} Sheds
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-black text-[#0052CC] font-mono text-sm">
                          ₹{totalCost.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                          {formatDate(session.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onLoad(session)}
                              className="px-2.5 py-1 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg transition-colors text-[11px] font-black uppercase tracking-wider"
                            >
                              Resume
                            </button>
                            {!session.is_completed && (
                              <button
                                onClick={() => onComplete(session.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-100 rounded-lg transition-all"
                                title="Mark as Completed"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(session.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 border border-red-100 rounded-lg transition-all"
                              title="Delete Work Log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-4 sm:px-6 rounded-2xl border border-[#E5E7EB] shadow-sm mt-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold uppercase text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="relative ml-3 inline-flex items-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold uppercase text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between animate-fade-in">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Showing page <span className="font-bold text-[#1A1A1A]">{page}</span> of <span className="font-bold text-[#1A1A1A]">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-1 bg-gray-50 p-1 border border-[#E5E7EB]" aria-label="Pagination">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-lg px-2 py-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-lg px-2 py-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "relative inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                      page === p
                        ? "bg-white text-[#0052CC] shadow-sm border border-[#E5E7EB]"
                        : "text-[#6B7280] hover:bg-white hover:text-[#1A1A1A]"
                    )}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-lg px-2 py-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-lg px-2 py-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  Last
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
