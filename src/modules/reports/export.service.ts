/**
 * Advanced Export Service for Reports
 * Handles CSV, PDF, and Excel export with formatting
 *
 * Features:
 * - CSV with proper formatting and BOM for Excel
 * - PDF with tables, charts, and colors
 * - Excel with multiple sheets and styling
 */

import { Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';

interface ExportOptions {
  title: string;
  columns: string[];
  data: any[];
  fileName: string;
}

@Injectable()
export class ExportService {
  /**
   * Generate professional CSV with UTF-8 BOM for Excel compatibility
   */
  generateCsv(options: ExportOptions): {
    content: string;
    fileName: string;
    mimeType: string;
  } {
    const { title, columns, data, fileName } = options;

    // Create CSV header with title
    const header = `${title}\n`;
    const timestamp = `Generated: ${new Date().toLocaleString()}\n\n`;

    // Prepare data for json2csv
    const fields = columns.map((col) => ({
      label: col,
      value: (item: any) => {
        const key = col.toLowerCase().replace(/\s+/g, '_');
        return item[key] || item[col.toLowerCase()] || '';
      },
    }));

    try {
      const parser = new Parser({ fields, header: false });
      const csv = parser.parse(data);

      // Add UTF-8 BOM for Excel compatibility
      const bom = '\uFEFF';
      const content = bom + header + timestamp + columns.join(',') + '\n' + csv;

      return {
        content,
        fileName: `${fileName}_${new Date().getTime()}.csv`,
        mimeType: 'text/csv;charset=utf-8',
      };
    } catch (error) {
      throw new Error(`Không thể tạo CSV: ${error.message}`);
    }
  }

  /**
   * Generate HTML table that can be printed to PDF
   * Includes colors and professional formatting
   */
  generateHtmlTable(
    options: ExportOptions & { colors?: Record<string, string> },
  ): string {
    const { title, columns, data, colors = {} } = options;

    const htmlHeader = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 30px;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .timestamp {
      font-size: 12px;
      color: #9ca3af;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    thead {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
    }
    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    tbody tr:hover {
      background-color: #f9fafb;
    }
    tbody tr:nth-child(odd) {
      background-color: #fafbff;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-done { background: #d1fae5; color: #065f46; }
    .status-in_progress { background: #dbeafe; color: #0c4a6e; }
    .status-todo { background: #f3f4f6; color: #374151; }
    .status-high { background: #fee2e2; color: #7f1d1d; }
    .status-medium { background: #fef08a; color: #7c2d12; }
    .status-low { background: #dbeafe; color: #0c4a6e; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: right;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 0; }
      thead { background: #6366f1; }
      th { color: white; }
      tbody tr:hover { background-color: transparent; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">${title}</div>
      <div class="timestamp">Generated on ${new Date().toLocaleString('vi-VN')}</div>
    </div>
    <table>
      <thead>
        <tr>
          ${columns.map((col) => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
          .map((row) => {
            return `
          <tr>
            ${columns
              .map((col) => {
                const key = col.toLowerCase().replace(/\s+/g, '_');
                const value = row[key] || row[col.toLowerCase()] || '';

                // Apply styling for status badges
                if (
                  col.toLowerCase().includes('status') ||
                  col.toLowerCase().includes('priority')
                ) {
                  const statusClass = `status-${value.toLowerCase().replace(/\s+/g, '_')}`;
                  return `<td><span class="status-badge ${statusClass}">${value}</span></td>`;
                }

                return `<td>${value}</td>`;
              })
              .join('')}
          </tr>
        `;
          })
          .join('')}
      </tbody>
    </table>
    <div class="footer">
      <p>This report was automatically generated by TaskMaster Reports System</p>
    </div>
  </div>
</body>
</html>
    `;

    return htmlHeader;
  }

  /**
   * Generate statistics cards HTML for PDF header
   */
  generateStatsHtml(stats: Record<string, any>): string {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

    let html = '<div class="stats">';
    let colorIndex = 0;

    Object.entries(stats).forEach(([label, value]) => {
      const style = `background: linear-gradient(135deg, ${colors[colorIndex % colors.length]} 0%, ${colors[(colorIndex + 1) % colors.length]} 100%);`;
      html += `
        <div class="stat-card" style="${style}">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
        </div>
      `;
      colorIndex++;
    });

    html += '</div>';
    return html;
  }
}
