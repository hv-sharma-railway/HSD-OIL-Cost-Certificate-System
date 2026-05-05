import React, { useMemo } from 'react';
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
  Calendar
} from 'lucide-react';
import { ConsumptionRecord, MONTHS } from '../types';

interface AnalyticsProps {
  records: ConsumptionRecord[];
}

const COLORS = ['#0052CC', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const Analytics: React.FC<AnalyticsProps> = ({ records }) => {
  const overallStats = useMemo(() => {
    const totalLitres = records.reduce((sum, r) => sum + r.total_litres, 0);
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
    const coachLitres = records.reduce((sum, r) => sum + r.coach_litres, 0);
    const goodsLitres = records.reduce((sum, r) => sum + (r.is_power_car ? 0 : r.goods_litres), 0);
    
    return {
      totalLitres,
      totalAmount,
      coachLitres,
      goodsLitres,
      count: records.length
    };
  }, [records]);

  const fyStats = useMemo(() => {
    const data: Record<string, { total: number; amount: number }> = {};
    records.forEach(r => {
      const year = parseInt(r.year);
      const monthIdx = MONTHS.indexOf(r.month);
      // FY starts in April (index 3)
      const fyLabel = monthIdx >= 3 
        ? `FY ${year}-${(year + 1).toString().slice(-2)}`
        : `FY ${year - 1}-${year.toString().slice(-2)}`;
      
      if (!data[fyLabel]) data[fyLabel] = { total: 0, amount: 0 };
      data[fyLabel].total += r.total_litres;
      data[fyLabel].amount += r.amount;
    });
    return Object.entries(data).sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  const consumptionByShed = useMemo(() => {
    const data: Record<string, number> = {};
    records.forEach(r => {
      data[r.shed_name] = (data[r.shed_name] || 0) + r.total_litres;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

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
      if (data.hasOwnProperty(key)) {
        data[key] += r.total_litres;
      }
    });

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [records]);

  const supplyingShedShare = useMemo(() => {
    const data: Record<string, number> = {};
    records.forEach(r => {
      data[r.supplying_shed] = (data[r.supplying_shed] || 0) + r.total_litres;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [records]);

  const exportToCSV = () => {
    const headers = ['Shed', 'Railway', 'Supplying Shed', 'For Month', 'For Year', 'Coach Litres', 'Goods Litres', 'Total Litres', 'Amount', 'Is Power Car', 'Period'];
    const rows = records.map(r => [
      r.shed_name,
      r.railway,
      r.supplying_shed,
      r.month,
      r.year,
      r.coach_litres,
      r.goods_litres,
      r.total_litres,
      Math.round(r.amount),
      r.is_power_car ? 'Yes' : 'No',
      r.pricing_period
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HSD_Oil_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
        <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No consumption records found for analytics.</p>
        <p className="text-sm">Complete Step 4 and download certificates to generate records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Total Consumption</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-[#0052CC]">{Math.round(overallStats.totalLitres).toLocaleString('en-IN')}</h3>
            <p className="text-xs font-bold text-[#6B7280]">Litres</p>
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            {(overallStats.totalLitres / 1000).toFixed(2)} K.Ltrs Total
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Total Amount</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-[#0052CC]">₹{Math.round(overallStats.totalAmount).toLocaleString('en-IN')}</h3>
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-2 italic">Based on certificates downloaded</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Coach vs Goods</p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">{Math.round((overallStats.coachLitres / overallStats.totalLitres) * 100) || 0}%</p>
              <p className="text-[10px] text-[#6B7280]">Coach</p>
            </div>
            <div className="h-4 w-px bg-[#E5E7EB]" />
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">{Math.round((overallStats.goodsLitres / overallStats.totalLitres) * 100) || 0}%</p>
              <p className="text-[10px] text-[#6B7280]">Goods</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB] flex flex-col justify-between">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Export Data</p>
          <button 
            onClick={exportToCSV}
            className="w-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1A1A1A] font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-[#0052CC]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Consumption Trend (Last 12 Months)</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0052CC" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0052CC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(val: number) => [`${val.toLocaleString('en-IN')} Ltrs`, 'Consumption']}
                />
                <Area type="monotone" dataKey="value" stroke="#0052CC" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Consumption by Shed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0052CC]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Top Consuming Sheds</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumptionByShed.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A', fontWeight: 'bold' }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" fill="#0052CC" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplying Shed Share */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#0052CC]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Supply Distribution</h3>
            </div>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={supplyingShedShare}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {supplyingShedShare.map((entry, index) => (
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

        {/* Recent Records List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0052CC]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Fiscal Year Summary</h3>
            </div>
          </div>
          <div className="space-y-3">
            {fyStats.map(([fy, stats]) => (
              <div key={fy} className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Calendar className="w-4 h-4 text-[#0052CC]" />
                  </div>
                  <span className="font-bold text-sm text-[#1A1A1A]">{fy}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#0052CC]">{Math.round(stats.total).toLocaleString('en-IN')} Ltrs</p>
                  <p className="text-[10px] font-bold text-[#6B7280]">₹{Math.round(stats.amount).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Records List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#0052CC]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">Recent Transactions</h3>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {records.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-[#1A1A1A]">{r.shed_name} ({r.railway})</p>
                  <p className="text-[10px] text-[#6B7280]">{r.month} {r.year} • {r.supplying_shed}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#0052CC]">{r.total_litres.toLocaleString('en-IN')} Ltrs</p>
                  <p className="text-[10px] text-[#9CA3AF]">₹{Math.round(r.amount).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
