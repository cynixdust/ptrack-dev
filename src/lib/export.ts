import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Project, Task, ProjectStats } from '../types';

export const exportToPDF = (stats: ProjectStats, projects: Project[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('ScrumFlow: Personal Productivity Report', 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
  
  // Stats Table
  autoTable(doc, {
    startY: 40,
    head: [['Metric', 'Value']],
    body: [
      ['Total Projects', stats.totalProjects],
      ['Total Tasks', stats.totalTasks],
      ['Completed Tasks', stats.completedTasks],
      ['Completion Rate', `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%`],
      ['Total Hours Logged', `${Math.round(stats.totalHours)}h`]
    ],
    theme: 'striped',
    headStyles: { fillColor: '#18181b' }
  });

  // Projects Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Project Name', 'Created At', 'Description']],
    body: projects.map(p => [p.name, new Date(p.created_at).toLocaleDateString(), p.description || 'N/A']),
    theme: 'grid',
    headStyles: { fillColor: '#18181b' }
  });

  doc.save('ScrumFlow-Report.pdf');
};

export const exportToExcel = (stats: ProjectStats, projects: Project[]) => {
  const wb = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    { Metric: 'Total Projects', Value: stats.totalProjects },
    { Metric: 'Total Tasks', Value: stats.totalTasks },
    { Metric: 'Completed Tasks', Value: stats.completedTasks },
    { Metric: 'Total Hours', Value: stats.totalHours }
  ];
  const summaryWS = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
  
  // Projects Sheet
  const projectsWS = XLSX.utils.json_to_sheet(projects);
  XLSX.utils.book_append_sheet(wb, projectsWS, 'Projects');
  
  XLSX.writeFile(wb, 'ScrumFlow-Data.xlsx');
};

export const exportUserManual = () => {
  const doc = new jsPDF();
  const primaryColor = '#dc2626'; // Red-600
  const secondaryColor = '#0f172a'; // Slate-900
  
  // Header
  doc.setFillColor(secondaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor('#ffffff');
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("Hyde's Project Tracker Pro", 14, 25);
  
  doc.setFontSize(10);
  doc.setTextColor('#cbd5e1');
  doc.text("Official User & Strategy Guide", 14, 32);
  
  let y = 50;

  // Introduction
  doc.setTextColor(secondaryColor);
  doc.setFontSize(16);
  doc.text("1. Introduction", 14, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#475569');
  const intro = "Hyde's Project Tracker Pro is an elite task management and strategic planning tool designed for high-performance teams. It combines the rigorous structure of Agile Scrum with intuitive multi-workspace management and AI-driven insights.";
  doc.text(doc.splitTextToSize(intro, 180), 14, y);
  y += 20;

  // Core Concepts
  doc.setTextColor(secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("2. Key Concepts", 14, y);
  y += 10;
  
  const concepts = [
    ["Workspace", "Top-level entity representing a company or major organization unit."],
    ["Strategy", "Large-scale initiative or project within a workspace."],
    ["Tactical Intent", "A specific task or story that needs execution."],
    ["Focus Session", "Time tracking for individual tasks to measure throughput."]
  ];
  
  autoTable(doc, {
    startY: y,
    head: [['Concept', 'Description']],
    body: concepts,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 14 }
  });
  
  y = (doc as any).lastAutoTable.finalY + 15;

  // Interaction Guide
  doc.setTextColor(secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("3. Operating Instructions", 14, y);
  y += 10;

  const instructions = [
    "• Switch Workspaces: Use the selector in the far left pane to move between companies.",
    "• Create Strategy: Navigate to 'Strategies' and click the '+' icon.",
    "• Add Intent: Use the 'Insert Task' button to define new tactical requirements.",
    "• Track Time: Press the 'Play' icon on any task to start a focus session.",
    "• Sync/Refresh: Use the dedicated buttons in the sidebar for real-time updates.",
    "• AI Insights: Visit the dashboard for automated strategic analysis of your data."
  ];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#475569');
  instructions.forEach(line => {
    doc.text(line, 14, y);
    y += 7;
  });

  y += 10;

  // Advanced Features
  doc.setTextColor(primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("4. Advanced Capabilities", 14, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#475569');
  const advanced = "The system supports full custom branding. Admins can upload logos and rename the application via 'System Config'. The reporting engine generates real-time PDF and Excel exports for stakeholder reviews.";
  doc.text(doc.splitTextToSize(advanced, 180), 14, y);
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor('#94a3b8');
    doc.text(`Page ${i} of ${pageCount} | Hyde's Project Tracker Pro`, 210 - 70, 285);
  }

  doc.save('Hydes-Tracker-Manual.pdf');
};
