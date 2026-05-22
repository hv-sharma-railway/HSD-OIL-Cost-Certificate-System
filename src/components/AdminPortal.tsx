import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building, 
  ShieldCheck, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils';

export const AdminPortal: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [sheds, setSheds] = useState<any[]>([]);
  const [supplyingSheds, setSupplyingSheds] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'SHED_MANAGER', shed_id: '', supplying_shed_id: '' });
  const [newShed, setNewShed] = useState({ shed_name: '', railway: '' });
  const [newSupplyingShed, setNewSupplyingShed] = useState({ shed_name: '', railway: '' });
  const [activePortalTab, setActivePortalTab] = useState<'users' | 'sheds' | 'supplying'>('users');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const responses = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/sheds', { headers }),
        fetch('/api/admin/supplying-sheds', { headers }),
        fetch('/api/sessions', { headers })
      ]);
      
      const data = await Promise.all(responses.map(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error ${res.status}: ${text.substring(0, 100)}`);
        }
        return res.json();
      }));

      setUsers(data[0]);
      setSheds(data[1]);
      setSupplyingSheds(data[2]);
      setSessions(data[3]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setShowAddUser(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    await fetch(`/api/sessions/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/sessions/${id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  return (
    <div className="space-y-8 relative">
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-xl font-black text-gray-900 mb-6">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Username</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Role</label>
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                >
                  <option value="SHED_MANAGER">SHED_MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              {newUser.role === 'SHED_MANAGER' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Supplying Shed</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                    value={newUser.supplying_shed_id}
                    onChange={e => setNewUser({ ...newUser, supplying_shed_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {supplyingSheds.map(s => (
                      <option key={s.id} value={s.id}>{s.shed_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-black hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Create Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dashboard Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActivePortalTab('users')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activePortalTab === 'users' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          User Directory
        </button>
        <button
          onClick={() => setActivePortalTab('sheds')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activePortalTab === 'sheds' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Consuming Sheds
        </button>
        <button
          onClick={() => setActivePortalTab('supplying')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activePortalTab === 'supplying' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Supplying Sheds
        </button>
      </div>

      {activePortalTab === 'users' && (
        <>
          {/* Pending Approvals */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-amber-900">Pending Approvals</h2>
                  <p className="text-xs text-amber-700 font-bold">Sessions awaiting verification</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Manager</th>
                    <th className="px-6 py-4">Session Info</th>
                    <th className="px-6 py-4">Submitted At</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.filter(s => s.status === 'PENDING').map(session => (
                    <tr key={session.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0052CC]/10 flex items-center justify-center font-black text-[#0052CC] text-xs">
                            {session.owner_name?.[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-black text-gray-900">{session.owner_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{session.name}</span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase">{session.month} {session.year}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-500">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(session.id)}
                            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100"
                            title="Approve Session"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleReject(session.id)}
                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100"
                            title="Reject Session"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sessions.filter(s => s.status === 'PENDING').length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold text-sm">
                        No pending approvals at the moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* User Management */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-gray-900">User Directory</h2>
              </div>
              <button 
                onClick={() => setShowAddUser(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Add New User
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Shed Mapping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 font-black text-gray-900">{u.username}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black uppercase",
                          u.role === 'ADMIN' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-500 text-sm">
                        <div className="flex flex-col gap-0.5">
                          {u.shed_id && <span className="text-indigo-600">Consuming: {sheds.find(s => s.id === u.shed_id)?.shed_name || u.shed_id}</span>}
                          {u.supplying_shed_id && <span className="text-emerald-600">Supplying: {supplyingSheds.find(s => s.id === u.supplying_shed_id)?.shed_name || u.supplying_shed_id}</span>}
                          {!u.shed_id && !u.supplying_shed_id && <span>Master Access</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activePortalTab !== 'users' && (
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-gray-900">
                {activePortalTab === 'sheds' ? 'Consuming Shed Master' : 'Supplying Shed Master'}
              </h2>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50/50 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                placeholder="Shed Name"
                className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                value={activePortalTab === 'sheds' ? newShed.shed_name : newSupplyingShed.shed_name}
                onChange={e => activePortalTab === 'sheds' ? setNewShed({...newShed, shed_name: e.target.value}) : setNewSupplyingShed({...newSupplyingShed, shed_name: e.target.value})}
              />
              <input
                placeholder="Railway (e.g. CR)"
                className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                value={activePortalTab === 'sheds' ? newShed.railway : newSupplyingShed.railway}
                onChange={e => activePortalTab === 'sheds' ? setNewShed({...newShed, railway: e.target.value}) : setNewSupplyingShed({...newSupplyingShed, railway: e.target.value})}
              />
              <button
                onClick={async () => {
                  const data = activePortalTab === 'sheds' ? newShed : newSupplyingShed;
                  const endpoint = activePortalTab === 'sheds' ? '/api/admin/sheds' : '/api/admin/supplying-sheds';
                  await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(data)
                  });
                  if (activePortalTab === 'sheds') setNewShed({shed_name: '', railway: ''});
                  else setNewSupplyingShed({shed_name: '', railway: ''});
                  fetchData();
                }}
                className="bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-black shadow-lg shadow-indigo-100"
              >
                Add Shed
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Shed Name</th>
                  <th className="px-6 py-4">Railway</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(activePortalTab === 'sheds' ? sheds : supplyingSheds).map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-400">{s.id}</td>
                    <td className="px-6 py-4 font-black text-gray-900">{s.shed_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-500">{s.railway}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={async () => {
                          const endpoint = activePortalTab === 'sheds' ? `/api/admin/sheds/${s.id}` : `/api/admin/supplying-sheds/${s.id}`;
                          await fetch(endpoint, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          fetchData();
                        }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
