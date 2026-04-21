import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key-change-it";

// Initialize Database with persistence support
let dbPath = "scrumflow.db";

// Handle dynamic path for Electron or other environments
if (process.env.APPDATA || process.env.HOME) {
    const userDataPath = process.env.DATABASE_URL 
        ? path.dirname(process.env.DATABASE_URL)
        : path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config'), 'scrumflow');
    
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }
    dbPath = path.join(userDataPath, 'scrumflow.db');
}

const db = new Database(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

// Database Migrations & Initial Schema
try {
    const projectColumns = db.prepare("PRAGMA table_info(projects)").all() as any[];
    const hasCompanyId = projectColumns.some(c => c.name === 'company_id');
    if (projectColumns.length > 0 && !hasCompanyId) {
        db.prepare("ALTER TABLE projects ADD COLUMN company_id TEXT").run();
        // Set a default company for existing projects if they existed
        db.prepare("UPDATE projects SET company_id = 'comp-1' WHERE company_id IS NULL").run();
    }
} catch (e) {
    // Table might not exist yet, handled by CREATE TABLE IF NOT EXISTS below
}

// Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('Admin', 'Member')) DEFAULT 'Member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    app_logo TEXT,
    db_type TEXT CHECK(db_type IN ('sqlite', 'postgres', 'mongodb')) DEFAULT 'sqlite',
    pg_url TEXT,
    mongo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS epics (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    epic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    status TEXT CHECK(status IN ('Backlog', 'To Do', 'In Progress', 'Review', 'Done')) DEFAULT 'Backlog',
    points INTEGER DEFAULT 0,
    FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT CHECK(status IN ('To Do', 'In Progress', 'Review', 'Done')) DEFAULT 'To Do',
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    due_date TEXT,
    estimated_time REAL DEFAULT 0,
    actual_time REAL DEFAULT 0,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT CHECK(status IN ('Planned', 'Active', 'Completed')) DEFAULT 'Planned',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration REAL DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Access denied" });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// Seed Data helper
const seed = () => {
    const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
    if (userCount === 0) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)")
        .run("user-1", "admin", hashedPassword, "Admin");
    }

    const companyCount = (db.prepare("SELECT COUNT(*) as count FROM companies").get() as any).count;
    let companyId = "comp-1";
    if (companyCount === 0) {
      db.prepare("INSERT INTO companies (id, name) VALUES (?, ?)")
        .run(companyId, "Default Corp");
    } else {
        companyId = (db.prepare("SELECT id FROM companies LIMIT 1").get() as any).id;
    }

    const settingsCount = (db.prepare("SELECT COUNT(*) as count FROM app_settings").get() as any).count;
    if (settingsCount === 0) {
      db.prepare("INSERT INTO app_settings (id, db_type) VALUES (1, 'sqlite')").run();
    }

    const projectCount = (db.prepare("SELECT COUNT(*) as count FROM projects").get() as any).count;
    if (projectCount === 0) {
        db.prepare("INSERT INTO projects (id, company_id, name, description) VALUES (?, ?, ?, ?)")
            .run("proj-1", companyId, "Product Launch 2026", "Main project reveal.");
        
        // Add a default epic/story/task for the seed project
        db.prepare("INSERT INTO epics (id, project_id, name, description) VALUES (?, ?, ?, ?)")
            .run("epic-1", "proj-1", "Initial Epic", "Getting started.");
        db.prepare("INSERT INTO stories (id, epic_id, name, description, priority, status) VALUES (?, ?, ?, ?, ?, ?)")
            .run("story-1", "epic-1", "Initial Story", "Setup the workspace.", "High", "To Do");
        db.prepare("INSERT INTO tasks (id, story_id, name, status, priority, estimated_time) VALUES (?, ?, ?, ?, ?, ?)")
            .run("task-1", "story-1", "First Task", "To Do", "Medium", 2);
    }
}
seed();

// Branding / Upload
app.post("/api/upload", authenticateToken, (req, res) => {
    const { image } = req.body; // Expecting base64
    if (!image) return res.status(400).json({ error: "No image provided" });
    // In a real app we'd save to disk/cloud storage. Here we just echo it for client-side storage or save to DB.
    res.json({ url: image }); 
});

// Auth Routes
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  res.json({ id: user.id, username: user.username, role: user.role });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: "Invalid session" });
  }
});

// Company Routes
app.get("/api/companies", authenticateToken, (req, res) => {
  const companies = db.prepare("SELECT * FROM companies").all();
  res.json(companies);
});

app.post("/api/companies", authenticateToken, (req, res) => {
    const { id, name, logo_url } = req.body;
    db.prepare("INSERT INTO companies (id, name, logo_url) VALUES (?, ?, ?)").run(id, name, logo_url);
    res.json({ id, name, logo_url });
});

app.delete("/api/companies/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// Project Routes (Filtered by Company)
app.get("/api/companies/:companyId/projects", authenticateToken, (req, res) => {
    const projects = db.prepare("SELECT * FROM projects WHERE company_id = ?").all(req.params.companyId);
    res.json(projects);
});

app.post("/api/projects", authenticateToken, (req, res) => {
  const { id, company_id, name, description } = req.body;
  db.prepare("INSERT INTO projects (id, company_id, name, description) VALUES (?, ?, ?, ?)").run(id, company_id, name, description);
  res.status(201).json({ id, company_id, name, description });
});

app.get("/api/projects/:id/full", authenticateToken, (req, res) => {
  const { id } = req.params;
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as any;
  if (!project) return res.status(404).json({ error: "Project not found" });

  const epics = db.prepare("SELECT * FROM epics WHERE project_id = ?").all(id);
  const epicsWithChildren = epics.map((epic: any) => {
    const stories = db.prepare("SELECT * FROM stories WHERE epic_id = ?").all(epic.id);
    const storiesWithTasks = stories.map((story: any) => {
      const tasks = db.prepare("SELECT * FROM tasks WHERE story_id = ?").all(story.id);
      return { ...story, tasks };
    });
    return { ...epic, stories: storiesWithTasks };
  });

  res.json({ ...project, epics: epicsWithChildren });
});

// User Management (Admin Only)
app.get("/api/admin/users", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT id, username, role, created_at FROM users").all();
    res.json(users);
});

app.post("/api/admin/users", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: "Forbidden" });
    const { id, username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)").run(id, username, hashedPassword, role);
    res.json({ id, username, role });
});

app.delete("/api/admin/users/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: "Forbidden" });
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// Settings Routes
app.get("/api/settings", authenticateToken, (req, res) => {
    const settings = db.prepare("SELECT * FROM app_settings WHERE id = 1").get();
    res.json(settings);
});

app.post("/api/settings", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: "Forbidden" });
    const { app_logo, db_type, pg_url, mongo_url } = req.body;
    db.prepare("UPDATE app_settings SET app_logo = ?, db_type = ?, pg_url = ?, mongo_url = ? WHERE id = 1")
        .run(app_logo, db_type, pg_url, mongo_url);
    res.json({ success: true });
});

// Sprint and Task Routes (Unchanged logic but adding auth)
app.get("/api/sprints/:projectId", authenticateToken, (req, res) => {
  const { projectId } = req.params;
  const sprints = db.prepare("SELECT * FROM sprints WHERE project_id = ? ORDER BY start_date DESC").all(projectId);
  res.json(sprints);
});

app.post("/api/sprints", authenticateToken, (req, res) => {
  const { id, project_id, name, start_date, end_date, status } = req.body;
  db.prepare("INSERT INTO sprints (id, project_id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, project_id, name, start_date, end_date, status || 'Planned');
  res.status(201).json({ id, project_id, name, start_date, end_date, status });
});

app.get("/api/tasks/:id", authenticateToken, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.json(task || null);
});

app.post("/api/tasks", authenticateToken, (req, res) => {
    const { story_id, name, priority, estimated_time, due_date } = req.body;
    const id = `task-${Date.now()}`;
    db.prepare("INSERT INTO tasks (id, story_id, name, priority, estimated_time, due_date) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, story_id, name, priority || 'Medium', estimated_time || 0, due_date || null);
    res.json({ id, story_id, name });
});

app.delete("/api/tasks/:id", authenticateToken, (req, res) => {
    console.log(`Attempting to delete task: ${req.params.id}`);
    const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    console.log(`Deleted ${result.changes} rows from tasks`);
    res.json({ success: true, changes: result.changes });
});

app.patch("/api/tasks/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const keys = Object.keys(updates);
  if (keys.length === 0) return res.json({ success: true, message: "No updates" });
  const values = Object.values(updates);
  const setClause = keys.map(k => `${k} = ?`).join(", ");
  db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...values, id);
  res.json({ success: true });
});

app.post("/api/timelogs", authenticateToken, (req, res) => {
  const { id, task_id, start_time, duration } = req.body;
  db.prepare("INSERT INTO time_logs (id, task_id, start_time, duration) VALUES (?, ?, ?, ?)").run(id, task_id, start_time, duration);
  db.prepare("UPDATE tasks SET actual_time = (SELECT SUM(duration) FROM time_logs WHERE task_id = ?) WHERE id = ?").run(task_id, task_id);
  res.status(201).json({ id, task_id, start_time, duration });
});

app.get("/api/reports/summary", authenticateToken, (req, res) => {
  const stats = {
    totalProjects: (db.prepare("SELECT COUNT(*) as count FROM projects").get() as any).count,
    totalTasks: (db.prepare("SELECT COUNT(*) as count FROM tasks").get() as any).count,
    completedTasks: (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Done'").get() as any).count,
    totalHours: (db.prepare("SELECT SUM(duration) as sum FROM time_logs").get() as any).sum || 0
  };
  res.json(stats);
});

// Vite Middleware
async function startServer() {
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In Electron packaged app, we might need a more robust path
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
