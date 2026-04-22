export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done';
export type SprintStatus = 'Planned' | 'Active' | 'Completed';

export interface Project {
  id: string;
  company_id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Creator' | 'Member' | 'Read-Only';
  created_at: string;
}

export interface AppSettings {
  app_logo: string | null;
  db_type: 'sqlite' | 'postgres' | 'mongodb';
  pg_url: string;
  mongo_url: string;
}

export interface Epic {
  id: string;
  project_id: string;
  name: string;
  description: string;
}

export interface UserStory {
  id: string;
  epic_id: string;
  name: string;
  description: string;
  priority: Priority;
  status: Status;
  points: number;
  tasks?: Task[];
}

export interface Task {
  id: string;
  story_id: string;
  name: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  priority: Priority;
  due_date: string;
  estimated_time: number;
  actual_time: number;
  notes?: string;
  is_na?: boolean;
  owner_id?: string;
  owner_name?: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
}

export interface TimeLog {
  id: string;
  task_id: string;
  start_time: string;
  duration: number;
}

export interface ProjectStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
}
