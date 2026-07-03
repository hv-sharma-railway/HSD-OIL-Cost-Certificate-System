import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  User, 
  Calendar, 
  Activity, 
  Tag, 
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils';

export interface AuditLog {
  id: string;
  session_id: string | null;
  session_name: string | null;
  user_email: string;
  action_type: string;
  details: string;
  timestamp: string;
}

interface AuditTrailProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ logs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        (log.session_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = filterAction === 'all' || log.action_type === filterAction;
      
      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, filterAction]);

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach(l => actions.add(l.action_type));
    return Array.from(actions);
  }, [logs]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      'CREATE': 'bg-blue-50 text-blue-700 border-blue-100',
      'UPDATE': 'bg-amber-50 text-amber-700 border-amber-100',
      'COMPLETE': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'DELETE': 'bg-rose-50 text-rose-700 border-rose-100',
      'LOAD': 'bg-purple-50 text-purple-700 border-purple-100',
      'PRICE_ADD': 'bg-indigo-50 text-indigo-700 border-indigo-100',
      'PRICE_UPDATE': 'bg-orange-50 text-orange-700 border-orange-100',
      'PRICE_DELETE': 'bg-red-50 text-red-700 border-red-100',
    };

    const style = styles[action] || 'bg-gray-50 text-gray-700 border-gray-100';

    return (
      <span className={cn(
        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
        style
      )}>
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E7EB]">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-5 h-5" />
            <input
              type="text"
              placeholder="Search audit logs by keyword, operator, or work log name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] shrink-0"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>

            <button
              onClick={onRefresh}
              className="p-3.5 bg-[#F3F4F6] text-[#4B5563] rounded-2xl hover:bg-[#E5E7EB] hover:text-[#111827] transition-all flex items-center justify-center border border-[#E5E7EB] shrink-0 active:scale-95"
              title="Refresh Logs"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="text-[#0052CC] w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[#4B5563]">System Audit Logs (History)</h2>
          </div>
          <span className="text-xs font-bold text-[#6B7280] bg-white border border-[#E5E7EB] px-3 py-1 rounded-xl shadow-sm">
            Total {filteredLogs.length} Operations logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F9FAFB] text-[#6B7280] text-[10px] font-black uppercase tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-4">Timestamp & Operator</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Log / Scope</th>
                <th className="px-6 py-4">Description of Move</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A] font-bold">
                          <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {formatDate(log.timestamp)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] font-medium">
                          <User className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {log.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.action_type)}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-[#1A1A1A]">
                      {log.session_name || <span className="text-gray-400 italic">Global System</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-[#4B5563] font-medium leading-relaxed max-w-md break-words whitespace-pre-line">
                        {log.details}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-[#9CA3AF] italic">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-20 text-[#0052CC]" />
                    No audit logs match the current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
