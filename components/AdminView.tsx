
import React, { useState, useEffect, useMemo } from 'react';
import { ledgerService } from '../services/ledgerService';
import { storageService } from '../services/storageService';
import { AccountStatus, AuditLogEntry, UserProfile, UserRole } from '../types';

interface AdminViewProps {
  onLogout: () => void;
}

type AdminTab = 'OVERVIEW' | 'RESEARCHERS' | 'AUDIT';

export const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Announcement state
  const [announcementMsg, setAnnouncementMsg] = useState('');

  // Mock Admin Address for the current session context
  const ADMIN_ADDR = "0xAdmin...8888"; 

  const refreshData = () => {
    setAllUsers(ledgerService.getAllUsers());
    setPendingUsers(ledgerService.getPendingUsers());
    setAuditLog(ledgerService.getAuditTrail());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Compute Institute Stats
  const stats = useMemo(() => {
    const docs = storageService.getAllDocuments();
    const researchers = allUsers.filter(u => u.role === UserRole.RESEARCHER);
    const activeProjects = docs.filter(d => d.status === 'PROCESSING').length; // Mock logic, usually active collections
    const completedProjects = docs.filter(d => d.status === 'COMPLETE').length;
    
    // Domain aggregation
    const domains: Record<string, number> = {};
    docs.forEach(d => { domains[d.domain] = (domains[d.domain] || 0) + 1; });
    const topDomains = Object.entries(domains).sort((a,b) => b[1] - a[1]).slice(0, 4);

    return {
        totalResearchers: researchers.length,
        totalPublications: docs.length,
        activeProjects: activeProjects > 0 ? activeProjects : 4, // Mock active if 0 for demo visual
        completedProjects,
        topDomains
    };
  }, [allUsers]);

  const handleApprove = async (address: string) => {
    setIsLoading(true);
    setTimeout(async () => {
      await ledgerService.approveUser(ADMIN_ADDR, address);
      setNotification(`Tx Confirmed: Access Granted to ${address.slice(0, 6)}...`);
      refreshData();
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }, 1000);
  };

  const handleReject = async (address: string) => {
    await ledgerService.rejectUser(ADMIN_ADDR, address);
    refreshData();
  };

  const handleSuspend = async (address: string) => {
    if(confirm("Are you sure you want to suspend this user's access?")) {
        await ledgerService.updateUserStatus(ADMIN_ADDR, address, AccountStatus.SUSPENDED);
        refreshData();
    }
  };

  const handleReactivate = async (address: string) => {
      await ledgerService.updateUserStatus(ADMIN_ADDR, address, AccountStatus.APPROVED);
      refreshData();
  };

  const handleBroadcast = () => {
      if(!announcementMsg.trim()) return;
      storageService.addNotification({
          id: `ann_${Date.now()}`,
          recipientId: 'ALL',
          type: 'ANNOUNCEMENT',
          title: 'Institute Announcement',
          message: announcementMsg,
          timestamp: Date.now(),
          read: false
      });
      setAnnouncementMsg('');
      setNotification('Announcement broadcasted to all users.');
      setTimeout(() => setNotification(null), 3000);
  };

  const TabButton = ({ tab, label, icon }: { tab: AdminTab, label: string, icon: string }) => (
    <button 
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
            ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}
        `}
    >
        <i className={`fa-solid ${icon}`}></i> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      
      {/* Admin Header */}
      <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 pt-6">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-indigo-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        IR
                     </div>
                     <div>
                        <h1 className="text-xl font-bold text-slate-900">Institute Governance</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Administrator Panel</p>
                     </div>
                 </div>
                 <div className="flex items-center gap-4">
                     <div className="text-right">
                         <p className="text-sm font-bold text-slate-900">Dr. Admin User</p>
                         <p className="text-xs text-slate-500 font-mono">{ADMIN_ADDR}</p>
                     </div>
                     <button 
                        onClick={onLogout}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-sm font-medium transition-colors"
                     >
                        <i className="fa-solid fa-right-from-bracket"></i>
                     </button>
                 </div>
              </div>
              
              <div className="flex gap-2">
                 <TabButton tab="OVERVIEW" label="Dashboard Overview" icon="fa-chart-pie" />
                 <TabButton tab="RESEARCHERS" label="User Management" icon="fa-users-gear" />
                 <TabButton tab="AUDIT" label="Audit Ledger" icon="fa-scroll" />
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {notification && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-bounce">
            <i className="fa-solid fa-circle-check"></i>
            {notification}
            </div>
        )}

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Researchers</p>
                        <div className="flex justify-between items-end">
                            <span className="text-3xl font-bold text-slate-900">{stats.totalResearchers}</span>
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><i className="fa-solid fa-users"></i></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Publications</p>
                        <div className="flex justify-between items-end">
                            <span className="text-3xl font-bold text-slate-900">{stats.totalPublications}</span>
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center"><i className="fa-regular fa-file-lines"></i></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Active Projects</p>
                        <div className="flex justify-between items-end">
                            <span className="text-3xl font-bold text-slate-900">{stats.activeProjects}</span>
                            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><i className="fa-solid fa-flask"></i></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Pending Actions</p>
                        <div className="flex justify-between items-end">
                            <span className="text-3xl font-bold text-amber-600">{pendingUsers.length}</span>
                            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><i className="fa-solid fa-bell"></i></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Pending Approvals & Domain Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Pending Widget */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50 rounded-t-xl">
                                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                                    <i className="fa-solid fa-user-clock"></i> Pending Access Requests
                                </h3>
                                <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
                             </div>
                             <div className="p-5">
                                 {pendingUsers.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-sm">
                                        <i className="fa-solid fa-check-circle text-2xl mb-2 text-emerald-400 block"></i>
                                        All caught up! No pending requests.
                                    </div>
                                 ) : (
                                     <div className="space-y-3">
                                         {pendingUsers.map(user => (
                                             <div key={user.address} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                 <div className="mb-3 sm:mb-0">
                                                     <div className="flex items-center gap-2">
                                                         <span className="font-bold text-slate-900">{user.name}</span>
                                                         <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{user.role}</span>
                                                     </div>
                                                     <p className="text-xs text-slate-500">{user.institute} • {user.address.slice(0,10)}...</p>
                                                 </div>
                                                 <div className="flex gap-2">
                                                     <button 
                                                        onClick={() => handleApprove(user.address)}
                                                        disabled={isLoading}
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition-colors"
                                                     >
                                                        {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Approve"}
                                                     </button>
                                                     <button 
                                                        onClick={() => handleReject(user.address)}
                                                        disabled={isLoading}
                                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded shadow-sm transition-colors"
                                                     >
                                                        Reject
                                                     </button>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        </div>

                        {/* Domain Distribution */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-6">Research Output by Domain</h3>
                            <div className="space-y-4">
                                {stats.topDomains.map(([domain, count], idx) => (
                                    <div key={domain}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700">{domain}</span>
                                            <span className="text-slate-500">{count} papers</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                                            <div 
                                                className={`h-2.5 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'][idx % 4]}`} 
                                                style={{ width: `${(count / stats.totalPublications) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {stats.topDomains.length === 0 && <p className="text-sm text-slate-400">No data available.</p>}
                            </div>
                        </div>

                    </div>

                    {/* Right Col: Quick Actions & Status */}
                    <div className="space-y-8">
                        <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 rounded-xl p-6 text-white shadow-lg">
                             <h3 className="font-bold mb-4">Governance Actions</h3>
                             <div className="space-y-3">
                                <div className="bg-white/10 p-4 rounded-lg border border-white/10">
                                    <label className="text-xs font-bold uppercase text-indigo-200 block mb-2">Broadcast Announcement</label>
                                    <textarea 
                                        value={announcementMsg}
                                        onChange={e => setAnnouncementMsg(e.target.value)}
                                        placeholder="Type alert message..."
                                        className="w-full bg-white/10 border border-white/20 rounded p-2 text-sm text-white placeholder-indigo-300 outline-none focus:bg-white/20 h-20 mb-2 resize-none"
                                    ></textarea>
                                    <button 
                                        onClick={handleBroadcast}
                                        className="w-full py-2 bg-white text-indigo-900 rounded font-bold text-xs hover:bg-indigo-50 transition-colors"
                                    >
                                        Send to All
                                    </button>
                                </div>

                                <button onClick={() => setActiveTab('RESEARCHERS')} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-left px-4 text-sm font-medium transition-colors flex items-center gap-3">
                                    <i className="fa-solid fa-user-gear"></i> Manage Access
                                </button>
                             </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-4">System Status</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Blockchain Sync</span>
                                    <span className="text-emerald-600 font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Storage Usage</span>
                                    <span className="text-slate-900 font-medium">45%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Active Nodes</span>
                                    <span className="text-slate-900 font-medium">12</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- RESEARCHER MANAGEMENT TAB --- */}
        {activeTab === 'RESEARCHERS' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800">Institute Directory</h3>
                        <p className="text-sm text-slate-500">Manage access for researchers and reviewers.</p>
                    </div>
                    <div className="relative">
                         <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                         <input type="text" placeholder="Search users..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Joined</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allUsers.map(user => (
                            <tr key={user.address} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{user.address.slice(0, 10)}...</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                                        ${user.role === UserRole.INSTITUTE_ADMIN ? 'bg-purple-100 text-purple-700' : 
                                          user.role === UserRole.RESEARCHER ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}
                                    `}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.status === AccountStatus.APPROVED && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active
                                        </span>
                                    )}
                                    {user.status === AccountStatus.PENDING && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Pending
                                        </span>
                                    )}
                                    {user.status === AccountStatus.SUSPENDED && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Suspended
                                        </span>
                                    )}
                                     {user.status === AccountStatus.REJECTED && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Rejected
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {new Date(user.joinedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {user.status === AccountStatus.APPROVED && user.role !== UserRole.INSTITUTE_ADMIN && (
                                        <button 
                                            onClick={() => handleSuspend(user.address)}
                                            className="text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
                                        >
                                            Suspend Access
                                        </button>
                                    )}
                                    {user.status === AccountStatus.SUSPENDED && (
                                        <button 
                                            onClick={() => handleReactivate(user.address)}
                                            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded transition-colors"
                                        >
                                            Reactivate
                                        </button>
                                    )}
                                    {user.status === AccountStatus.PENDING && (
                                        <button 
                                            onClick={() => setActiveTab('OVERVIEW')} // Direct to Overview to approve
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded transition-colors"
                                        >
                                            Review Request
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* --- AUDIT TAB --- */}
        {activeTab === 'AUDIT' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <i className="fa-solid fa-link text-indigo-500"></i>
                    Immutable Audit Ledger
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Cryptographically linked record of all access control and governance events.
                    </p>
                </div>
                
                <div className="p-0 overflow-auto">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actor</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hash Anchor</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {auditLog.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900">{log.action}</span>
                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{log.details}</span>
                            </div>
                            </td>
                            <td className="px-6 py-3">
                            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1 rounded">
                                {log.actor.slice(0, 8)}...
                            </span>
                            </td>
                            <td className="px-6 py-3">
                            <div className="flex items-center gap-2" title={log.blockHash}>
                                <i className="fa-solid fa-cube text-indigo-300 text-xs"></i>
                                <span className="text-[10px] font-mono text-slate-400 max-w-[150px] truncate">
                                {log.blockHash}
                                </span>
                            </div>
                            </td>
                            <td className="px-6 py-3 text-right text-xs text-slate-500">
                                {new Date(log.timestamp).toLocaleString()}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
