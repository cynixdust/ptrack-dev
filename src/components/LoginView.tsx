import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button, Card, cn } from './ui';
import { Lock, User as UserIcon } from 'lucide-react';

import { AppSettings } from '../types';

export function LoginView({ onLogin, settings }: { onLogin: (user: any) => void, settings: AppSettings | null }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await api.login(username, password);
      onLogin(user);
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
      <Card className="w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className={cn(
            "h-16 w-16 mb-4 flex items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-red-200",
            settings?.app_logo ? "bg-white" : "bg-red-600"
          )}>
            {settings?.app_logo ? (
                <img src={settings.app_logo} alt="Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
            ) : (
                <Lock className="text-white" size={32} />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
          <p className="text-slate-500">Sign in to your Tracker Pro account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

          <Button type="submit" className="w-full py-6 rounded-xl shadow-lg shadow-red-100 mt-4">
            Sign In
          </Button>
        </form>
        
        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Default Credentials: admin / admin123</p>
        </div>
      </Card>
    </div>
  );
}
