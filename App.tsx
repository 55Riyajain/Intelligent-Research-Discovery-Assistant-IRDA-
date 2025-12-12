
import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoginView } from './components/LoginView';
import { AdminView } from './components/AdminView';
import { UserProfile, UserRole, AccountStatus } from './types';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleLogout = () => {
    setUserProfile(null);
  };

  // 1. Not Logged In
  if (!userProfile) {
    return <LoginView onLogin={setUserProfile} />;
  }

  // 2. Logged in but PENDING Approval (Researcher OR Reviewer)
  const needsApproval = userProfile.role !== UserRole.INSTITUTE_ADMIN && userProfile.role !== UserRole.SYSTEM_ADMIN;
  
  if (needsApproval && userProfile.status === AccountStatus.PENDING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white max-w-lg w-full p-8 rounded-2xl shadow-xl text-center border border-slate-200">
          <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Identity Verification Pending</h2>
          <p className="text-slate-600 mb-6">
            Your <strong>{userProfile.role.toLowerCase()}</strong> identity has been recorded on the ledger. 
            An Institute Administrator must verify your credentials before you can access the platform.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg text-left text-sm text-slate-500 mb-6 font-mono border border-slate-200">
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Status:</span>
              <span className="text-amber-600 font-bold">{userProfile.status}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Role:</span>
              <span className="text-slate-700">{userProfile.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wallet:</span>
              <span className="text-slate-700">{userProfile.address.slice(0,10)}...</span>
            </div>
          </div>
          
          <div className="mb-6 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 text-left">
            <i className="fa-solid fa-lightbulb mt-0.5"></i>
            <span>
              <strong>Tip:</strong> If you are testing, click <strong>Sign Out</strong>, then use the <strong>"Enter Demo Mode"</strong> button on the login screen to access a pre-approved account.
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="text-indigo-600 font-medium hover:underline"
          >
            Sign out and check later
          </button>
        </div>
      </div>
    );
  }

  // 3. Main App Layout
  return (
    <div className="min-h-screen bg-slate-50">
      {userProfile.role === UserRole.INSTITUTE_ADMIN ? (
        <AdminView onLogout={handleLogout} />
      ) : (
        <Dashboard user={userProfile} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
