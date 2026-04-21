import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, LayoutDashboard, Kanban, Settings as SettingsIcon, Clock, CheckCircle2, Plus, Search, Bell, ChevronRight, TrendingUp, BarChart3, Sparkles, Play, Pause, LogOut, Building, FolderLock, FileText, Calendar } from 'lucide-react';
import { Button, Card, Badge, cn } from './components/ui';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './lib/api';
import { Project, Task, User, Company, AppSettings, ProjectStats, Priority } from './types';
import { LoginView } from './components/LoginView';
import { SettingsView } from './components/SettingsView';
import { CompanySwitcher } from './components/CompanySwitcher';
import { GoogleGenAI } from "@google/genai";
import { exportToPDF, exportToExcel } from './lib/export';

// Modal Component
function Modal({ isOpen, onClose, title, children, footer }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, footer?: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/50"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex flex-col">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">{title}</h3>
            <div className="h-1 w-8 bg-red-600 rounded-full mt-1" />
          </div>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md text-slate-400 transition-all group">
            <Plus size={24} className="rotate-45 group-hover:text-red-600 transition-colors" />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
        {footer && (
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                {footer}
            </div>
        )}
      </motion.div>
    </div>
  );
}

// AI Analysis Component
function AIInsight({ data }: { data: any }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      const prompt = `As a project manager, analysis this data: ${JSON.stringify(data)}. Provide 3 actionable bullets for improvement. Simple markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setInsight(response.text || "Could not generate insight.");
    } catch (err) {
      console.error(err);
      setInsight("Check Gemini API config.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={analyze} disabled={loading} className="gap-2 bg-gradient-to-r from-zinc-900 to-red-900">
        <Sparkles size={16} />
        {loading ? "Analyzing..." : "AI Performance Analysis"}
      </Button>
      {insight && (
        <Card className="p-6 bg-white border-2 border-red-50 shadow-lg shadow-red-100/20">
          <div className="prose prose-sm max-w-none prose-slate">
            <div className="flex items-center gap-2 mb-4 text-red-600">
               <Sparkles size={18} />
               <span className="font-bold text-xs uppercase tracking-widest">AI Strategic Forecast</span>
            </div>
            <div className="whitespace-pre-wrap text-slate-600 leading-relaxed font-medium">{insight}</div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'projects' | 'settings' | 'reports'>(
    (localStorage.getItem('scrumflow_active_tab') as any) || 'projects'
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    localStorage.getItem('scrumflow_active_project_id')
  );
  const [activeProject, setActiveProject] = useState<any>(null);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [selectedEpicId, setSelectedEpicId] = useState<string>('');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyDesc, setNewStrategyDesc] = useState('');
  const [editingTaskName, setEditingTaskName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Medium');
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    localStorage.getItem('scrumflow_active_company_id')
  );

  useEffect(() => {
    if (activeTab) localStorage.setItem('scrumflow_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('scrumflow_active_project_id', activeProjectId);
    } else {
      localStorage.removeItem('scrumflow_active_project_id');
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (activeCompany) {
      setActiveCompanyId(activeCompany.id);
    }
  }, [activeCompany]);

  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem('scrumflow_active_company_id', activeCompanyId);
    } else {
      localStorage.removeItem('scrumflow_active_company_id');
    }
  }, [activeCompanyId]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && activeCompany) {
      loadProjects();
    }
  }, [user, activeCompany]);

  useEffect(() => {
    if (user && activeProjectId) {
      loadProjectDetails();
    }
  }, [user, activeProjectId]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const checkAuth = async () => {
    try {
      const u = await api.getMe();
      const s = await api.getSettings();
      setUser(u);
      setSettings(s);
      
      // Try to restore company
      const comps = await api.getCompanies();
      const savedId = localStorage.getItem('scrumflow_active_company_id');
      if (comps.length > 0) {
        const found = comps.find(c => c.id === savedId) || comps[0];
        setActiveCompany(found);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const isAdmin = user?.role === 'Admin';
  const isCreator = isAdmin || user?.role === 'Creator';
  const isMember = user?.role !== 'Read-Only';
  const isReadOnly = user?.role === 'Read-Only';

  const loadProjects = async () => {
    if (!activeCompany) return;
    const data = await api.getProjectsByCompany(activeCompany.id);
    const summary = await api.getSummaryStats();
    setProjects(data);
    setStats(summary);
    if (data.length > 0 && !activeProjectId) {
      setActiveProjectId(data[0].id);
    }
  };

  const loadProjectDetails = async () => {
    if (!activeProjectId) return;
    const data = await api.getProjectDetails(activeProjectId);
    setActiveProject(data);
  };

  const handleLogout = async () => {
      await api.logout();
      setUser(null);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing ScrumMaster...</div>;
  if (!user) return <LoginView onLogin={(u) => setUser(u)} />;

  return (
    <div className="flex h-screen bg-[#F1F5F9] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-100 ring-2 ring-red-50">
               {settings?.app_logo ? (
                   <img src={settings.app_logo} alt="Logo" className="h-6 w-6 object-contain" referrerPolicy="no-referrer" />
               ) : (
                   <Sparkles className="text-white" size={20} />
               )}
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900">Hyde's<span className="text-red-600"> Tracker Pro</span></span>
          </div>

          <CompanySwitcher 
            activeCompany={activeCompany} 
            onSelect={setActiveCompany} 
            onRefresh={loadProjects}
          />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20} />} label="Analytics" onClick={() => setActiveTab('dashboard')} />
          <NavItem active={activeTab === 'projects'} icon={<FolderLock size={20} />} label="Strategies" onClick={() => setActiveTab('projects')} />
          <NavItem active={activeTab === 'board'} icon={<Kanban size={20} />} label="Task Board" onClick={() => setActiveTab('board')} />
          <NavItem active={activeTab === 'reports'} icon={<BarChart3 size={20} />} label="Reporting" onClick={() => setActiveTab('reports')} />
          <NavItem active={activeTab === 'settings'} icon={<SettingsIcon size={20} />} label="System Config" onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-6 mt-auto">
            <div className="mt-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs cursor-help" title={`Logged in as ${user.username}`}>
                        {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-slate-500 truncate max-w-[80px]">{user.username}</span>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut size={16} />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center gap-4 text-xs font-semibold tracking-tight text-slate-400">
            <span className="uppercase">Workspace</span>
            <span className="text-slate-200">/</span>
            <span className="text-slate-900 font-bold">{activeCompany?.name || 'Loading'}</span>
            <ChevronRight size={14} />
            <span className="text-red-600 font-bold">{activeProjectId && Array.isArray(projects) ? projects.find(p => p.id === activeProjectId)?.name : 'Strategies'}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Focus Session</span>
                    <span className="text-sm font-mono font-bold tabular-nums text-slate-900">{format(new Date(time * 1000), 'mm:ss')}</span>
                </div>
                <Button 
                    variant={isTimerRunning ? 'outline' : 'primary'} 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-lg"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                    {isTimerRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </Button>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Global search (⌘K)" 
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="p-10 flex-1">
          <AnimatePresence mode="wait">
             {activeTab === 'dashboard' && <Dashboard stats={stats} />}
             {activeTab === 'projects' && (
                <motion.div 
                  key="projects"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-4xl font-bold tracking-tight mb-2 text-slate-900">Strategies</h2>
                        <p className="text-slate-500 font-medium">Manage initiatives for <span className="text-red-600 font-bold">{activeCompany?.name}</span></p>
                      </div>
                      {isCreator && (
                        <Button className="rounded-xl shadow-lg shadow-red-200 font-bold px-8 ring-2 ring-red-50" onClick={() => {
                            if (!activeCompany) {
                                alert('Protocol Error: No Workspace Selected. Please select a company from the sidebar.');
                                return;
                            }
                            setIsCreateModalOpen(true);
                        }}>
                          Create Strategy
                        </Button>
                      )}
                    </div>

                    <Modal 
                        isOpen={isCreateModalOpen} 
                        onClose={() => setIsCreateModalOpen(false)}
                        title="Initialize New Strategy"
                        footer={
                            <>
                                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                                <Button onClick={async () => {
                                    if (!newStrategyName || !activeCompany) return;
                                    try {
                                        setAuthLoading(true);
                                        const newProj = await api.createProject(activeCompany.id, newStrategyName, newStrategyDesc || 'Strategic initiative for high-performance delivery.');
                                        await loadProjects();
                                        setActiveProjectId(newProj.id);
                                        setNewStrategyName('');
                                        setNewStrategyDesc('');
                                        setIsCreateModalOpen(false);
                                        setActiveTab('board');
                                    } catch(err) {
                                        alert('Protocol Failure: Project instantiation interrupted.');
                                    } finally {
                                        setAuthLoading(false);
                                    }
                                }}>Finalize & Launch</Button>
                            </>
                        }
                    >
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Strategy Name</label>
                                <input 
                                    type="text" 
                                    value={newStrategyName}
                                    onChange={e => setNewStrategyName(e.target.value)}
                                    placeholder="e.g. Q3 Market Expansion"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Short Objective</label>
                                <textarea 
                                    value={newStrategyDesc}
                                    onChange={e => setNewStrategyDesc(e.target.value)}
                                    placeholder="The primary mission of this strategy..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all text-sm min-h-[100px]"
                                />
                            </div>
                        </div>
                    </Modal>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.isArray(projects) && projects.map(p => (
                        <Card key={p.id} className="p-8 group hover:border-red-600 hover:shadow-xl hover:shadow-red-100 transition-all border-slate-200 cursor-pointer bg-white" onClick={() => { setActiveProjectId(p.id); setActiveTab('board'); }}>
                           <div className="flex justify-between mb-8">
                             <div className="h-12 w-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-900 group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:scale-110 duration-300">{p.name[0]}</div>
                             <Badge variant="success">Active</Badge>
                           </div>
                           <h3 className="text-xl font-bold mb-2 text-slate-900">{p.name}</h3>
                           <p className="text-sm text-slate-400 mb-8 max-w-[200px]">Strategic planning and scrum execution for the team.</p>
                           <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                             <span className="tracking-widest">CREATED {format(new Date(p.created_at), 'MMM yyyy').toUpperCase()}</span>
                             <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-red-500" />
                           </div>
                        </Card>
                      ))}
                    </div>
                </motion.div>
             )}
             {activeTab === 'board' && (
                <KanbanBoard 
                    project={activeProject} 
                    user={user} 
                    searchQuery={searchQuery}
                    canEdit={isMember}
                    onUpdate={() => loadProjectDetails()} 
                    onSelectTask={(task) => setSelectedTask(task)} 
                    onEditTask={(task) => {
                        setEditingTask(task);
                        setEditingTaskName(task.name);
                    }}
                    onDeleteTask={(id) => setDeletingTaskId(id)}
                    onAddTask={() => {
                        const firstEpic = activeProject?.epics?.[0];
                        const firstStory = firstEpic?.stories?.[0];
                        setSelectedEpicId(firstEpic?.id || '');
                        setSelectedStoryId(firstStory?.id || '');
                        setIsAddTaskModalOpen(true);
                    }}
                />
             )}
             {activeTab === 'reports' && (
                  <div className="space-y-8 max-w-4xl">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-3xl font-bold mb-2 text-slate-900">Reporting Engine</h2>
                        <p className="text-slate-500 font-medium">Export high-fidelity documentation and data snapshots.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ReportCard 
                         title="Project Performance" 
                         desc="Detailed breakdown of completion rates and task velocity." 
                         onPdf={() => stats && exportToPDF(stats, projects)}
                         onExcel={() => stats && exportToExcel(stats, projects)}
                      />
                      <ReportCard 
                         title="Resource Utilization" 
                         desc="Analysis of logged time vs predicted effort totals." 
                         onPdf={() => stats && exportToPDF(stats, projects)}
                         onExcel={() => stats && exportToExcel(stats, projects)}
                      />
                    </div>
                  </div>
               )}
             {activeTab === 'settings' && <SettingsView user={user} />}
          </AnimatePresence>
        </div>
      </main>

      {/* Global Modals */}
      <Modal 
          isOpen={!!selectedTask} 
          onClose={() => setSelectedTask(null)} 
          title="Task Intelligence"
       >
          {selectedTask && (
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Task Objective</label>
                    <h4 className="text-xl font-bold text-slate-900 leading-tight">{selectedTask.name}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Due Date</label>
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                            <Clock size={14} className="text-red-500" />
                            {selectedTask.due_date ? (
                                <span>{format(new Date(selectedTask.due_date), 'MMM dd, yyyy')}</span>
                            ) : (
                                <span className="text-slate-400">No deadline</span>
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Priority</label>
                        <Badge variant={selectedTask.priority === 'Critical' ? 'error' : 'warning'} className="font-black">
                            {selectedTask.priority.toUpperCase()}
                        </Badge>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Context & Description</label>
                    <p className="text-slate-600 text-sm leading-relaxed bg-white p-4 border border-slate-100 rounded-xl italic">
                        {selectedTask.description || 'No detailed documentation provided for this task.'}
                    </p>
                </div>

                <div className="flex items-center justify-between p-4 border-2 border-red-50 rounded-xl bg-red-50/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-red-100">
                            {user?.username?.[0].toUpperCase()}
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500 block">Assigned Specialist</span>
                            <span className="font-bold text-slate-900 text-sm">{user?.username}</span>
                        </div>
                    </div>
                    <Badge variant="success">Online</Badge>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button 
                        variant="secondary" 
                        className="flex-1 gap-2"
                        onClick={() => {
                            setEditingTask(selectedTask);
                            setEditingTaskName(selectedTask.name);
                            setSelectedTask(null);
                        }}
                    >
                        <Edit2 size={16} /> Edit Task
                    </Button>
                    <Button 
                        variant="danger" 
                        className="flex-1 gap-2"
                        onClick={() => {
                            setDeletingTaskId(selectedTask.id);
                            setSelectedTask(null);
                        }}
                    >
                        <Trash2 size={16} /> Delete Task
                    </Button>
                </div>
            </div>
          )}
      </Modal>

      <Modal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          title="Redefine Task Objective"
          footer={
              <>
                  <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
                  <Button onClick={async () => {
                      if (!editingTaskName || !editingTask) return;
                      try {
                          setAuthLoading(true);
                          await api.updateTask(editingTask.id, { name: editingTaskName });
                          await loadProjectDetails();
                          setEditingTask(null);
                      } catch(err) {
                          alert('Protocol Failure: Task redirection interrupted.');
                      } finally {
                          setAuthLoading(false);
                      }
                  }}>Sync Changes</Button>
              </>
          }
      >
          <div className="space-y-4">
               <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Task Name</label>
                    <input 
                        type="text" 
                        value={editingTaskName}
                        onChange={e => setEditingTaskName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                    />
                </div>
          </div>
      </Modal>

      <Modal
          isOpen={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          title="New Strategic Intent"
          footer={
              <>
                  <Button variant="outline" onClick={() => setIsAddTaskModalOpen(false)}>Discard</Button>
                  <Button onClick={async () => {
                      if (!newTaskName || !selectedStoryId) {
                          alert('Protocol Error: Please define an intent and select a target story.');
                          return;
                      }
                      try {
                          setAuthLoading(true);
                          await api.createTask({
                              story_id: selectedStoryId,
                              name: newTaskName,
                              priority: newTaskPriority,
                              status: 'To Do'
                          });
                          await loadProjectDetails();
                          setIsAddTaskModalOpen(false);
                          setNewTaskName('');
                          setSelectedEpicId('');
                          setSelectedStoryId('');
                      } catch(err) {
                          alert('Protocol Failure: Task creation failed.');
                      } finally {
                          setAuthLoading(false);
                      }
                  }}>Deploy Task</Button>
              </>
          }
      >
          <div className="space-y-6">
               <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Epic</label>
                    <select 
                       value={selectedEpicId}
                       onChange={(e) => {
                           setSelectedEpicId(e.target.value);
                           const epic = activeProject?.epics?.find((ep: any) => ep.id === e.target.value);
                           setSelectedStoryId(epic?.stories?.[0]?.id || '');
                       }}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                    >
                        <option value="">Select an Epic...</option>
                        {activeProject?.epics?.map((epic: any) => (
                            <option key={epic.id} value={epic.id}>{epic.name}</option>
                        ))}
                    </select>
               </div>

               <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target User Story</label>
                    <select 
                       value={selectedStoryId}
                       onChange={(e) => setSelectedStoryId(e.target.value)}
                       disabled={!selectedEpicId}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all font-bold text-slate-900 disabled:opacity-50"
                    >
                        <option value="">Select a User Story...</option>
                        {activeProject?.epics?.find((ep: any) => ep.id === selectedEpicId)?.stories?.map((st: any) => (
                            <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                    </select>
               </div>

               <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intent Description</label>
                    <input 
                        type="text" 
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        placeholder="e.g. Purchase New Backup Servers"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                    />
               </div>

               <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Criticality Level</label>
                    <select 
                        value={newTaskPriority}
                        onChange={e => setNewTaskPriority(e.target.value as Priority)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
               </div>
          </div>
      </Modal>

      <Modal
          isOpen={!!deletingTaskId}
          onClose={() => setDeletingTaskId(null)}
          title="Confirm Strategic Decommission"
          footer={
              <>
                  <Button variant="outline" onClick={() => setDeletingTaskId(null)}>Keep Task</Button>
                  <Button variant="danger" onClick={async () => {
                      if (!deletingTaskId) return;
                      try {
                          setAuthLoading(true);
                          await api.deleteTask(deletingTaskId);
                          await loadProjectDetails();
                          setDeletingTaskId(null);
                      } catch(err) {
                          alert('Protocol Failure: Decommission sequence aborted.');
                      } finally {
                          setAuthLoading(false);
                      }
                  }}>Confirm Decommission</Button>
              </>
          }
      >
          <div className="py-4">
              <p className="text-slate-600">Are you sure you want to permanently remove this tactical objective? This action cannot be reversed and all associated time logs will be purged.</p>
          </div>
      </Modal>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden",
        active ? "bg-red-50 text-red-700 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "transition-colors",
        active ? "text-red-600" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {icon}
      </div>
      <span className="text-sm uppercase tracking-wider font-bold text-[11px]">{label}</span>
      {active && <motion.div layoutId="nav-pill" className="absolute left-0 h-8 w-1 bg-red-600 rounded-r-full" />}
    </button>
  );
}

function Dashboard({ stats }: { stats: ProjectStats | null }) {
  const chartData = [
    { name: 'Spr 1', progress: 40 },
    { name: 'Spr 2', progress: 65 },
    { name: 'Spr 3', progress: 85 },
    { name: 'Spr 4', progress: 92 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10 pb-20"
    >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCard title="Total Strategies" value={stats?.totalProjects.toString() || '0'} growth="+2" icon={<BarChart3 />} />
          <StatCard title="Active Sprint Velocity" value="42.5" growth="+12%" icon={<TrendingUp />} />
          <StatCard title="Team Efficiency" value="94%" growth="+2.4%" icon={<CheckCircle2 />} />
          <StatCard title="Resource Allocation" value={`${Math.round(stats?.totalHours || 0)}h`} growth="-4%" icon={<Clock />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 bg-white border-slate-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 font-sans">Sprint Performance</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip cursor={{ stroke: '#e2e8f0' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="progress" stroke="#dc2626" fillOpacity={1} fill="url(#colorProg)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 font-sans">Efficiency Ratio</h4>
            <div className="space-y-4">
               <ProgressBar label="Productivity Score" value={78} color="bg-emerald-500" />
               <ProgressBar label="Sprint Delivery" value={92} color="bg-red-500" />
               <ProgressBar label="Time Accuracy" value={64} color="bg-slate-400" />
            </div>
          </Card>
        </div>

        <AIInsight data={stats} />
    </motion.div>
  );
}

function StatCard({ title, value, growth, icon }: { title: string, value: string, growth: string, icon: React.ReactNode }) {
  const isPositive = growth.startsWith('+');
  return (
    <Card className="p-6 border-slate-200 bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
          {icon}
        </div>
        <div className={cn(
          "text-[10px] font-black px-2 py-1 rounded-lg",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {growth}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{value}</div>
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</div>
    </Card>
  );
}

function KanbanBoard({ 
  project, 
  user, 
  searchQuery,
  canEdit,
  onUpdate, 
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onAddTask
}: { 
  project: any, 
  user: User | null, 
  searchQuery: string,
  canEdit: boolean,
  onUpdate: () => void, 
  onSelectTask: (task: any) => void,
  onEditTask: (task: any) => void,
  onDeleteTask: (id: string) => void,
  onAddTask: () => void
}) {
  const columns = ['To Do', 'In Progress', 'Review', 'Done'];
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="h-24 w-24 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 animate-pulse">
            <Sparkles size={48} />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Intelligence Loading...</h3>
        <p className="text-slate-400 max-w-sm">Synchronizing strategic data and mission targets. This should only take a moment.</p>
      </div>
    );
  }

  const allTasks: (Task & { storyName: string, epicName: string })[] = [];
  project.epics?.forEach((epic: any) => {
    epic.stories?.forEach((story: any) => {
      story.tasks?.forEach((task: any) => {
        const matchesSearch = !searchQuery || 
          task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          epic.name.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;

        if (matchesSearch && matchesPriority) {
          allTasks.push({ ...task, storyName: story.name, epicName: epic.name });
        }
      });
    });
  });

  const changeStatus = async (id: string, s: any) => {
      try {
        await api.updateTask(id, { status: s });
        onUpdate();
      } catch (err) {
        console.error('Update status failed:', err);
      }
  };

  const filteredColumns = statusFilter === 'All' ? columns : [statusFilter];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-[calc(100vh-180px)] flex flex-col gap-8"
    >
       <div className="bg-red-600 rounded-2xl p-8 flex justify-between items-center shadow-xl shadow-red-100">
          <div className="flex items-center gap-6">
              <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Sparkles className="text-white" size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{project.name}</h3>
                  <p className="text-red-100/80 font-medium">Active Strategic Initiative</p>
              </div>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-100/60 mb-1">Status View</span>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-white/40 outline-none transition-all cursor-pointer"
                  >
                      <option value="All" className="text-slate-900 italic">Full Lifecycle</option>
                      {columns.map(c => <option key={c} value={c} className="text-slate-900 font-bold">{c}</option>)}
                  </select>
              </div>

              <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-100/60 mb-1">Impact Level</span>
                  <select 
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-white/40 outline-none transition-all cursor-pointer"
                  >
                      <option value="All" className="text-slate-900 italic">Any Priority</option>
                      {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p} className="text-slate-900 font-bold">{p}</option>)}
                  </select>
              </div>
          </div>
       </div>

       <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-6 h-full min-w-max">
            {filteredColumns.map(col => (
               <div key={col} className="w-80 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                     <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", col === 'Done' ? 'bg-emerald-500' : 'bg-red-500')} />
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{col}</h4>
                     </div>
                     <Badge variant="outline" className="h-5 text-[10px] bg-white">
                         {allTasks.filter(t => t.status === col).length}
                     </Badge>
                  </div>
                  
                  <div className="flex-1 bg-slate-200/30 border border-slate-200/50 rounded-2xl p-3 space-y-3 overflow-y-auto">
                          {allTasks.filter(t => t.status === col).map(task => (
                        <div 
                            key={task.id}
                            className="group relative"
                            onClick={() => onSelectTask(task)}
                        >
                            <Card className="p-5 border-slate-200 shadow-sm hover:border-red-400 hover:shadow-xl hover:shadow-red-100/30 hover:-translate-y-1 transition-all cursor-pointer bg-white group/card relative overflow-hidden">
                               <div className="flex justify-between items-center mb-3 pr-1">
                                 <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase">#{task.id.split('-')[0]}</span>
                                     <Badge variant={task.priority === 'Critical' ? 'error' : task.priority === 'High' ? 'warning' : 'default'} className="h-4 text-[9px] font-black tracking-widest border-none shadow-sm">
                                       {task.priority.toUpperCase()}
                                     </Badge>
                                 </div>
                                 
                                 {canEdit && (
                                     <div className="flex gap-1">
                                         <button 
                                           onClick={(e) => { 
                                               e.stopPropagation(); 
                                               onEditTask(task); 
                                           }} 
                                           title="Edit Task"
                                           className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                         >
                                             <Edit2 size={12} />
                                         </button>
                                         <button 
                                           onClick={(e) => { 
                                               e.stopPropagation(); 
                                               onDeleteTask(task.id); 
                                           }} 
                                           title="Delete Task"
                                           className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                         >
                                             <Trash2 size={12} />
                                         </button>
                                     </div>
                                 )}
                               </div>

                               <div className="mb-4">
                                   <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                       <Building size={10} className="shrink-0" />
                                       <span className="hover:text-red-500 transition-colors">{task.epicName}</span>
                                       <ChevronRight size={8} className="shrink-0 opacity-50" />
                                       <span className="text-red-500/70">{task.storyName}</span>
                                   </div>
                                   <h5 className="font-bold text-slate-800 text-[13px] leading-tight tracking-tight group-hover:text-red-600 transition-colors line-clamp-2">{task.name}</h5>
                               </div>

                               <div className="space-y-4">
                                   {/* Progress Bar */}
                                   <div className="space-y-1.5">
                                       <div className="flex justify-between items-center text-[10px] font-bold">
                                           <span className="text-slate-400 uppercase tracking-wider">Velocity</span>
                                           <span className="text-slate-600">{Math.round((task.actual_time / (task.estimated_time || 1)) * 100)}%</span>
                                       </div>
                                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                           <motion.div 
                                               initial={{ width: 0 }}
                                               animate={{ width: `${Math.min((task.actual_time / (task.estimated_time || 1)) * 100, 100)}%` }}
                                               className={cn(
                                                   "h-full rounded-full transition-colors",
                                                   (task.actual_time / (task.estimated_time || 1)) > 1 ? "bg-amber-500" : "bg-red-500"
                                               )}
                                           />
                                       </div>
                                   </div>

                                   <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                     <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                                            <Clock size={11} className="text-red-500" />
                                            <strong className="text-slate-900">{task.actual_time.toFixed(1)}h</strong>
                                            <span className="opacity-30">/</span>
                                            <span className="font-medium">{task.estimated_time || 0}h</span>
                                        </div>
                                        {task.due_date && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                                                <Calendar size={10} className="text-red-400" />
                                                <span>Due {format(new Date(task.due_date), 'MMM d')}</span>
                                            </div>
                                        )}
                                     </div>
                                     <select 
                                        value={task.status} 
                                        disabled={!canEdit}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={e => changeStatus(task.id, e.target.value)}
                                        className={cn(
                                            "text-[10px] border border-slate-200 rounded-lg px-2 py-1 outline-none font-bold text-slate-600 focus:ring-1 focus:ring-red-500 transition-all",
                                            canEdit ? "bg-slate-50 cursor-pointer hover:bg-white" : "bg-slate-100 cursor-not-allowed opacity-60"
                                        )}
                                     >
                                         {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                     </select>
                                   </div>
                               </div>
                            </Card>
                        </div>
                      ))}
                      {canEdit && (
                        <button 
                          onClick={onAddTask}
                          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400 hover:text-red-500 hover:bg-white transition-all"
                        >
                           + Add Intent
                        </button>
                      )}
                  </div>
               </div>
            ))}
          </div>
       </div>
    </motion.div>
  );
}

function ReportCard({ title, desc, onPdf, onExcel }: { title: string, desc: string, onPdf: () => void, onExcel: () => void }) {
  return (
    <Card className="p-8 border-slate-200 bg-white hover:border-red-200 transition-colors shadow-lg shadow-slate-100">
      <h4 className="font-bold text-lg mb-2 text-slate-900 tracking-tight">{title}</h4>
      <p className="text-sm text-slate-400 mb-8 leading-relaxed">{desc}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPdf} className="h-9 px-4 gap-2 font-bold uppercase tracking-wider text-[10px]">
          <FileText size={14} /> PDF Snapshot
        </Button>
        <Button variant="outline" size="sm" onClick={onExcel} className="h-9 px-4 gap-2 font-bold uppercase tracking-wider text-[10px]">
          <BarChart3 size={14} /> XLSX Data
        </Button>
      </div>
    </Card>
  );
}

function ProgressBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span className="text-slate-400">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={cn("h-full", color)} 
        />
      </div>
    </div>
  );
}
