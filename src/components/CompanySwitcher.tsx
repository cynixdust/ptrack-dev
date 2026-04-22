import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Company } from '../types';
import { Building, Plus, ChevronRight, LayoutGrid, Trash2, Edit2, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui';

export function CompanySwitcher({ 
    activeCompany, 
    onSelect,
    onRefresh
}: { 
    activeCompany: Company | null, 
    onSelect: (c: Company) => void,
    onRefresh: () => void 
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const data = await api.getCompanies();
    setCompanies(data);
    
    if (data.length > 0) {
        if (!activeCompany || !data.find(c => c.id === activeCompany.id)) {
            onSelect(data[0]);
        }
    }
  };

  const handleAdd = async () => {
    if (!newName) return;
    const c = await api.createCompany(newName);
    setNewName('');
    setShowAdd(false);
    loadCompanies();
    onSelect(c);
    onRefresh();
  };

  const handleUpdate = async (id: string) => {
    if (!editName) return;
    await api.updateCompany(id, { name: editName });
    setEditingId(null);
    loadCompanies();
    onRefresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Decommission workspace "${name}" and all associated strategic data?`)) {
      await api.deleteCompany(id);
      loadCompanies();
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workspaces</h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="h-5 w-5 bg-slate-100 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      {showAdd && (
          <div className="px-2 animate-in slide-in-from-top-2 duration-300">
              <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Company Name..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
              />
          </div>
      )}

      <div className="space-y-1 px-2">
        {companies.map((c) => (
          <div key={c.id} className="relative group">
            {editingId === c.id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                 <input 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-bold outline-none"
                    autoFocus
                 />
                 <button onClick={() => handleUpdate(c.id)} className="text-emerald-500"><Check size={14} /></button>
                 <button onClick={() => setEditingId(null)} className="text-slate-400"><X size={14} /></button>
              </div>
            ) : (
              <>
              <button
                onClick={() => onSelect(c)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  activeCompany?.id === c.id 
                    ? "bg-red-50 text-red-700 shadow-sm shadow-red-100/50" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    activeCompany?.id === c.id ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                )}>
                  {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                  ) : (
                      <Building size={16} />
                  )}
                </div>
                <span className="text-sm font-bold truncate pr-12">{c.name}</span>
                {activeCompany?.id === c.id && <div className="ml-auto w-1 h-4 bg-red-600 rounded-full" />}
              </button>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(c.id);
                    setEditName(c.name);
                  }}
                  className="h-6 w-6 bg-white shadow-sm border border-slate-100 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Edit2 size={10} />
                </button>
                <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleDelete(c.id, c.name);
                   }}
                   className="h-6 w-6 bg-white shadow-sm border border-slate-100 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
