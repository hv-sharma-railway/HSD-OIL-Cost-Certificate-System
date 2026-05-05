import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon,
  Download,
  Filter,
  TrendingUp,
  AlertCircle,
  Calendar,
  Building2,
  Zap,
  Info
} from 'lucide-react';
import { ConsumptionRecord, MONTHS } from '../types';
import { cn } from '../utils';

interface AnalyticsProps {
  records: ConsumptionRecord[];
}

const COLORS = ['#0052CC', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4F46E5', '#EC4899'];

export const Analytics: React.FC<AnalyticsProps> = ({ records }) => {
  const [filterType, setFilterType] = useState<'all' | 'year' | 'month' | 'fy'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  const years = useMemo(() => Array.from(new Set(records.map(r => r.year))).sort().reverse(), [records]);
  const financialYears = useMemo(() => {
    const sets = new Set<string>();
    records.forEach(r => {
      const year = parseInt(r.year);
      const monthIdx = MONTHS.indexOf(r.month);
      const fy = monthIdx >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year-1}-${year.toString().slice(-2)}`;
      sets.add(fy);
    });
    return Array.from(sets).sort().reverse();
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (filterType === 'all') return records;
    if (filterType === 'year') return records.filter(r => r.year === filterValue);
    if (filterType === 'month') return records.filter(r => r.month === filterValue);
    if (filterType === 'fy') {
      return records.filter(r => {
        const year = parseInt(r.year);
        const monthIdx = MONTHS.indexOf(r.month);
        const fy = monthIdx >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year-1}-${year.toString().slice(-2)}`;
        return fy === filterValue;
      });
    }
    return records;
  }, [records, filterType, filterValue]);

  const stats = useMemo(() => {
    const totalLitres = filteredRecords.reduce((sum, r) => sum + r.total_litres, 0);
    const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0);
    const coachLitres = filteredRecords.reduce((sum, r) => sum + r.coach_litres, 0);
    const goodsLitres = filteredRecords.reduce((sum, r) => sum + (r.is_power_car ? 0 : r.goods_litres), 0);
    
    const pcRecords = filteredRecords.filter(r => r.is_power_car);
    const pcLitres = pcRecords.reduce((sum, r) => sum + r.total_litres, 0);
    const pcAmount = pcRecords.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalLitres,
      totalAmount,
      coachLitres,
      goodsLitres,
      pcLitres,
      pcAmount,
      count: filteredRecords.length
    };
  }, [filteredRecords]);

  const analyticsData = useMemo(() => {
    const shedData: Record<string, number> = {};
    const rlyData: Record<string, number> = {};
    const allocData: Record<string, { total: number; amount: number }> = {
      'GOODS': { total: 0, amount: 0 },
      'COACH': { total: 0, amount: 0 },
      'POWER CAR': { total: 0, amount: 0 }
    };

    filteredRecords.forEach(r => {
      shedData[r.shed_name] = (shedData[r.shed_name] || 0) + r.total_litres;
      rlyData[r.railway] = (rlyData[r.railway] || 0) + r.total_litres;
      
      if (r.is_power_car) {
        allocData['POWER CAR'].total += r.total_litres;
        allocData['POWER CAR'].amount += r.amount;
      } else {
        allocData['GOODS'].total += r.goods_litres;
        allocData['COACH'].total += r.coach_litres;
        const ratio = r.total_litres > 0 ? r.amount / r.total_litres : 0;
        allocData['GOODS'].amount += r.goods_litres * ratio;
        allocData['COACH'].amount += r.coach_litres * ratio;
      }
    });

    return {
      byShed: Object.entries(shedData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byRailway: Object.entries(rlyData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byAllocation: Object.entries(allocData).map(([name, data]) => ({ name, value: data.total, amount: data.amount }))
    };
  }, [filteredRecords]);

  const monthlyTrend = useMemo(() => {
    const data: Record<string, number> = {};
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = MONTHS[d.getMonth()];
      const y = d.getFullYear().toString();
      return `${m} ${y}`;
    }).reverse();

    last12Months.forEach(m => data[m] = 0);
    records.forEach(r => {
      const key = `${r.month} ${r.year}`;
      if (data.hasOwnProperty(key)) data[key] += r.total_litres;
    });

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [records]);

  const exportToCSV = () => {
    const headers = ['Shed', 'Railway', 'Supplying Shed', 'For Month', 'For Year', 'Coach Litres', 'Goods Litres', 'Total Litres', 'Amount', 'Is Power Car', 'Period'];
    const rows = filteredRecords.map(r => [
      r.shed_name, r.railway, r.supplying_shed, r.month, r.year,
      r.coach_litres, r.goods_litres, r.total_litres, Math.round(r.amount),
      r.is_power_car ? 'Yes' : 'No', r.pricing_period
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HSD_Oil_Analytics_${filterType}_${filterValue || 'all'}.csv`;
    link.click();
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
        <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No consumption records found for analytics.</p>
        <p className="text-sm">Complete and save sessions to generate analytics data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            <Filter className="w-4 h-4 text-[#6B7280]" />
            <select 
              value={filterType}
              onChange={(e) => {
                const type = e.target.value as any;
                setFilterType(type);
                setFilterValue('');
              }}
              className="bg-transparent text-sm font-bold outline-none cursor-pointer"
            >
              <option value="all">All Records</option>
              <option value="year">By Year</option>
              <option value="month">By Month</option>
              <option value="fy">Financial Year</option>
            </select>
          </div>

          {filterType !== 'all' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
              <select 
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC]"
              >
                <option value="">Select {filterType === 'fy' ? 'FY' : filterType}</option>
                {filterType === 'year' && years.map(y => <option key={y} value={y}>{y}</option>)}
                {filterType === 'month' && MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                {filterType === 'fy' && financialYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
          )}
        </div>

        <button 
          onClick={exportToCSV}
          className="bg-[#0052CC] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#0052CC]/10 hover:shadow-[#0052CC]/20 hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export {filteredRecords.length} Records
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Total HSD Consumed</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-[#0052CC]">{Math.round(stats.totalLitres).toLocaleString('en-IN')}</h3>
            <p className="text-xs font-bold text-[#6B7280]">Litres</p>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden flex">
             <div className="bg-[#0052CC] h-full" style={{ width: `${(stats.goodsLitres / stats.totalLitres) * 100 || 0}%` }} title="Goods" />
             <div className="bg-[#00C49F] h-full" style={{ width: `${(stats.coachLitres / stats.totalLitres) * 100 || 0}%` }} title="Coach" />
             <div className="bg-amber-500 h-full" style={{ width: `${(stats.pcLitres / stats.totalLitres) * 100 || 0}%` }} title="Power Car" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Total Expenditure</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-[#0052CC]">₹{Math.round(stats.totalAmount).toLocaleString('en-IN')}</h3>
          </div>
          <p className="text-[10px] text-[#6B7280] mt-3 font-medium flex items-center gap-1">
            <Info className="w-3 h-3" />
            Avg. Rate: ₹{(stats.totalAmount / stats.totalLitres || 0).toFixed(2)} / Ltr
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Power Car Data</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-amber-600">{Math.round(stats.pcLitres).toLocaleString('en-IN')}</h3>
            <p className="text-xs font-bold text-[#6B7280]">Litres</p>
          </div>
          <p className="text-[10px] text-[#6B7280] mt-3 font-bold uppercase tracking-tighter">
            Cost: ₹{Math.round(stats.pcAmount).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Record Stats</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-[#1A1A1A]">{stats.count}</h3>
            <p className="text-xs font-bold text-[#6B7280]">Transactions</p>
          </div>
          <p className="text-[10px] text-[#6B7280] mt-3 italic">Filtered by {filterType} {filterValue}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Allocation-wise Consumption</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.byAllocation}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" fill="#0052CC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-[#0052CC]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Railway Distribution</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.byRailway}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData.byRailway.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(val: number) => `${val.toLocaleString('en-IN')} Ltrs`}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB] lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <LineChartIcon className="w-5 h-5 text-[#0052CC]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Global Consumption Over Time</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0052CC" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0052CC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#0052CC" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB] lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-[#0052CC]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Consumption by Shed (Top 15)</h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.byShed.slice(0, 15)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A', fontWeight: 'bold' }} width={120} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" fill="#0052CC" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
