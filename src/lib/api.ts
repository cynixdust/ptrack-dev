import { Project, Sprint, Task, ProjectStats, UserStory, Epic, Company, User, AppSettings } from "../types";

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<User> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Invalid login");
    return res.json();
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
  },
  getMe: async (): Promise<User | null> => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    return res.json();
  },

  // Companies
  getCompanies: async (): Promise<Company[]> => {
    const res = await fetch("/api/companies");
    return res.json();
  },
  createCompany: async (name: string, logo_url?: string): Promise<Company> => {
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), name, logo_url }),
    });
    return res.json();
  },
  updateCompany: async (id: string, updates: Partial<Company>): Promise<void> => {
    await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },
  deleteCompany: async (id: string): Promise<void> => {
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
  },

  // Projects
  getProjectsByCompany: async (companyId: string): Promise<Project[]> => {
    const res = await fetch(`/api/companies/${companyId}/projects`);
    return res.json();
  },
  createProject: async (companyId: string, name: string, description: string): Promise<Project> => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), company_id: companyId, name, description }),
    });
    return res.json();
  },
  updateProject: async (id: string, updates: Partial<Project>): Promise<void> => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },
  deleteProject: async (id: string): Promise<void> => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  },
  getProjectDetails: async (id: string): Promise<Project & { epics: (Epic & { stories: UserStory[] })[] }> => {
    const res = await fetch(`/api/projects/${id}/full`);
    return res.json();
  },
  createTask: async (task: Partial<Task>): Promise<Task> => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    return res.json();
  },

  // Settings & Admin
  getSettings: async (): Promise<AppSettings> => {
    const res = await fetch("/api/settings");
    return res.json();
  },
  updateSettings: async (settings: Partial<AppSettings>) => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  },
  getUsers: async (): Promise<User[]> => {
    const res = await fetch("/api/admin/users");
    return res.json();
  },
  createUser: async (user: Partial<User> & { password?: string }): Promise<User> => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), ...user }),
    });
    return res.json();
  },
  deleteUser: async (id: string) => {
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
  },

  uploadImage: async (base64: string): Promise<string> => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    });
    const data = await res.json();
    return data.url;
  },

  // Sprints & Tasks
  getSprints: async (projectId: string): Promise<Sprint[]> => {
    const res = await fetch(`/api/sprints/${projectId}`);
    return res.json();
  },
  createSprint: async (sprint: Partial<Sprint>): Promise<Sprint> => {
    const res = await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), ...sprint }),
    });
    return res.json();
  },
  updateTask: async (id: string, updates: Partial<Task>): Promise<void> => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },
  deleteTask: async (id: string): Promise<void> => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error('Task decommission failed');
  },
  logTime: async (taskId: string, duration: number): Promise<void> => {
    await fetch("/api/timelogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), task_id: taskId, start_time: new Date().toISOString(), duration }),
    });
  },
  getSummaryStats: async (): Promise<ProjectStats> => {
    const res = await fetch("/api/reports/summary");
    return res.json();
  },
};
