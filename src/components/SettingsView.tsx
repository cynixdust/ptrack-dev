import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button, Card, Badge } from './ui';
import { User, Database, Building, Trash2, Plus, ArrowRight, Settings } from 'lucide-react';
import { AppSettings, User as UserType } from '../types';

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Member'>('Member');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [s, u] = await Promise.all([api.getSettings(), api.getUsers()]);
      setSettings(s);
      setUsers(u);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLogo = async (url: string) => {
    if (!settings) return;
    const updated = { ...settings, app_logo: url };
    await api.updateSettings(updated);
    setSettings(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          try {
            const url = await api.uploadImage(base64);
            handleUpdateLogo(url);
          } catch(err) {
            alert('Upload failed');
          }
      };
      reader.readAsDataURL(file);
  };

  const handleUpdateDB = async (dbType: string) => {
      if (!settings) return;
      const updated = { ...settings, db_type: dbType as any };
      await api.updateSettings(updated);
      setSettings(updated);
  };

  const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await api.createUser({ username: newUsername, password: newPassword, role: newRole });
          setNewUsername('');
          setNewPassword('');
          loadAll();
      } catch (err) {
          alert('Error creating user');
      }
  };

  const handleDeleteUser = async (id: string) => {
      if (confirm('Delete user?')) {
          await api.deleteUser(id);
          loadAll();
      }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
            <Settings size={24} />
        </div>
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h2>
            <p className="text-slate-500 font-medium">Configure global workspace preferences and user access.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Branding */}
        <Card className="p-8 border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-6">
            <Building className="text-red-600" size={20} />
            <h3 className="font-bold text-slate-900">App Branding</h3>
          </div>
          <div className="space-y-4">
             <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">App Logo</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={settings?.app_logo || ''} 
                        onChange={(e) => handleUpdateLogo(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="Image URL..."
                    />
                    <div className="relative">
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg" 
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" size="sm" className="h-full">Upload</Button>
                    </div>
                </div>
             </div>
             {settings?.app_logo && (
                 <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-center">
                     <img src={settings.app_logo} alt="App Logo" className="h-12 object-contain" referrerPolicy="no-referrer" />
                 </div>
             )}
          </div>
        </Card>

        {/* Database Configuration */}
        <Card className="p-8 border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-6">
            <Database className="text-red-600" size={20} />
            <h3 className="font-bold text-slate-900">Database Engine</h3>
          </div>
          <div className="space-y-4">
             <div className="flex gap-2">
                {['sqlite', 'postgres', 'mongodb'].map((db) => (
                    <Button 
                        key={db}
                        variant={settings?.db_type === db ? 'primary' : 'outline'}
                        size="sm"
                        className="flex-1 capitalize"
                        onClick={() => handleUpdateDB(db)}
                    >
                        {db}
                    </Button>
                ))}
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Advanced Config</label>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400">HOST</span>
                        <input type="text" className="w-full px-2 py-1 bg-slate-100 border-none rounded text-xs" placeholder="localhost" readOnly={settings?.db_type === 'sqlite'} />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400">PORT</span>
                        <input type="text" className="w-full px-2 py-1 bg-slate-100 border-none rounded text-xs" placeholder={settings?.db_type === 'postgres' ? '5432' : '27017'} readOnly={settings?.db_type === 'sqlite'} />
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400">CONNECTION STRING</span>
                    <input 
                        type="text" 
                        value={settings?.db_type === 'postgres' ? (settings.pg_url || '') : settings?.db_type === 'mongodb' ? (settings.mongo_url || '') : 'scrumflow.db'}
                        onChange={(e) => {
                            if (!settings) return;
                            const field = settings.db_type === 'postgres' ? 'pg_url' : 'mongo_url';
                            const updated = { ...settings, [field]: e.target.value };
                            setSettings(updated);
                            api.updateSettings({ [field]: e.target.value });
                        }}
                        readOnly={settings?.db_type === 'sqlite'}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs"
                        placeholder="mongodb+srv://..."
                    />
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Enable SSL Connection</span>
                </div>
             </div>
          </div>
        </Card>
      </div>

      {/* User Management */}
      <Card className="p-8 border-slate-200 bg-white">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
                <User className="text-red-600" size={20} />
                <h3 className="font-bold text-slate-900">User Management</h3>
            </div>
            <Badge variant="success">{users.length} Active Users</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 border-r border-slate-100 pr-8">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Add New User</h4>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <input 
                          type="text" placeholder="Username" required
                          value={newUsername} onChange={e => setNewUsername(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                      <input 
                          type="password" placeholder="Password" required
                          value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                      <select 
                        value={newRole} onChange={e => setNewRole(e.target.value as any)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      >
                          <option value="Member">Member</option>
                          <option value="Admin">Admin</option>
                      </select>
                      <Button type="submit" className="w-full">Create User</Button>
                  </form>
              </div>

              <div className="lg:col-span-2">
                  <div className="space-y-3">
                      {users.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                              <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 capitalize">
                                      {u.username[0]}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-900">{u.username}</div>
                                      <div className="text-[10px] text-red-600 font-black uppercase tracking-widest">{u.role}</div>
                                  </div>
                              </div>
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500" onClick={() => handleDeleteUser(u.id)}>
                                  <Trash2 size={16} />
                              </Button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </Card>
    </div>
  );
}
