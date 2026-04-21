import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Project, Task, ProjectStats } from '../types';

export const exportToPDF = (stats: ProjectStats, projects: Project[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('ScrumFlow: Personal Productivity Report', 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
  
  // Stats Table
  (doc as any).autoTable({
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
    headStyles: { fillStyle: '#18181b' }
  });

  // Projects Table
  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Project Name', 'Created At', 'Description']],
    body: projects.map(p => [p.name, new Date(p.created_at).toLocaleDateString(), p.description || 'N/A']),
    theme: 'grid',
    headStyles: { fillStyle: '#18181b' }
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
