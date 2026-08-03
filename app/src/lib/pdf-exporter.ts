/**
 * PDF Exporter Utility for hyrd.
 * Generates ATS-friendly printable PDF documents for Resumes and Cover Letters
 */

export interface ExportPDFData {
  title: string;
  type: 'resume' | 'cover_letter';
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description: string[];
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  content?: string; // For raw cover letters
  company?: string;
  jobTitle?: string;
}

export function exportToPDF(data: ExportPDFData) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download your PDF.');
    return;
  }

  const isResume = data.type === 'resume';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${data.title}</title>
        <style>
          @page {
            size: letter;
            margin: 0.75in;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            line-height: 1.5;
            font-size: 11pt;
            margin: 0;
            padding: 0;
          }
          .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .name {
            font-size: 22pt;
            font-weight: bold;
            color: #1e293b;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .contact {
            font-size: 9.5pt;
            color: #475569;
            margin-top: 4px;
          }
          .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #2563eb;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
            margin-top: 18px;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .summary {
            font-size: 10.5pt;
            color: #334155;
            margin-bottom: 12px;
          }
          .skills-list {
            font-size: 10pt;
            color: #1e293b;
            margin-bottom: 12px;
          }
          .exp-item {
            margin-bottom: 12px;
          }
          .exp-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 11pt;
            color: #0f172a;
          }
          .exp-sub {
            display: flex;
            justify-content: space-between;
            font-style: italic;
            font-size: 10pt;
            color: #475569;
            margin-bottom: 4px;
          }
          ul {
            margin: 4px 0 0 18px;
            padding: 0;
          }
          li {
            margin-bottom: 3px;
            font-size: 10pt;
            color: #334155;
          }
          .cover-letter-body {
            font-size: 11pt;
            line-height: 1.6;
            white-space: pre-wrap;
            color: #1e293b;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="name">${data.name || 'Job Applicant'}</h1>
          <div class="contact">
            ${data.email ? `${data.email} | ` : ''}
            ${data.phone ? `${data.phone} | ` : ''}
            ${data.location || 'India'}
          </div>
        </div>

        ${isResume ? `
          ${data.summary ? `
            <div class="section-title">Professional Summary</div>
            <div class="summary">${data.summary}</div>
          ` : ''}

          ${data.skills && data.skills.length > 0 ? `
            <div class="section-title">Core Competencies & Technical Skills</div>
            <div class="skills-list"><strong>Skills:</strong> ${data.skills.join(', ')}</div>
          ` : ''}

          ${data.experience && data.experience.length > 0 ? `
            <div class="section-title">Professional Experience</div>
            ${data.experience.map(exp => `
              <div class="exp-item">
                <div class="exp-header">
                  <span>${exp.title}</span>
                  <span>${exp.duration}</span>
                </div>
                <div class="exp-sub">
                  <span>${exp.company}</span>
                </div>
                ${exp.description && exp.description.length > 0 ? `
                  <ul>
                    ${exp.description.map(desc => `<li>${desc}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).map(item => item).join('')}
          ` : ''}

          ${data.education && data.education.length > 0 ? `
            <div class="section-title">Education</div>
            ${data.education.map(edu => `
              <div class="exp-item">
                <div class="exp-header">
                  <span>${edu.degree}</span>
                  <span>${edu.year}</span>
                </div>
                <div class="exp-sub">
                  <span>${edu.institution}</span>
                </div>
              </div>
            `).join('')}
          ` : ''}
        ` : `
          <div style="margin-bottom: 20px; font-[10pt]; color: #475569;">
            <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
            ${data.jobTitle ? `<strong>Re:</strong> Application for ${data.jobTitle} position ${data.company ? `at ${data.company}` : ''}` : ''}
          </div>
          <div class="cover-letter-body">
            ${data.content || ''}
          </div>
        `}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
