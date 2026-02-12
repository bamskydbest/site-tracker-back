import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import type { Response } from 'express';

interface VisitData {
  technicianName: string;
  siteName: string;
  status: string;
  currentStep: string;
  checkInTime: Date;
  checkOutTime?: Date;
  gpsLocation: { lat: number; lng: number; address?: string };
}

export const generatePDF = (visits: VisitData[], res: Response): void => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=visits-report.pdf');
  doc.pipe(res);

  doc.fontSize(20).text('Site Tracker - Visit Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  visits.forEach((visit, i) => {
    if (i > 0) doc.moveDown();
    doc.fontSize(12).text(`${i + 1}. ${visit.siteName}`, { underline: true });
    doc.fontSize(10);
    doc.text(`  Technician: ${visit.technicianName}`);
    doc.text(`  Status: ${visit.status}`);
    doc.text(`  Step: ${visit.currentStep}`);
    doc.text(`  Check-in: ${new Date(visit.checkInTime).toLocaleString()}`);
    if (visit.checkOutTime) {
      doc.text(`  Check-out: ${new Date(visit.checkOutTime).toLocaleString()}`);
    }
    doc.text(`  Location: ${visit.gpsLocation.address || `${visit.gpsLocation.lat}, ${visit.gpsLocation.lng}`}`);
  });

  doc.end();
};


export const generateCSV = (visits: VisitData[], res: Response): void => {
  const fields = [
    { label: 'Technician', value: 'technicianName' },
    { label: 'Site', value: 'siteName' },
    { label: 'Status', value: 'status' },
    { label: 'Step', value: 'currentStep' },
    { label: 'Check-in', value: (row: VisitData) => new Date(row.checkInTime).toLocaleString() },
    { label: 'Check-out', value: (row: VisitData) => (row.checkOutTime ? new Date(row.checkOutTime).toLocaleString() : '') },
    { label: 'Location', value: (row: VisitData) => row.gpsLocation.address || `${row.gpsLocation.lat}, ${row.gpsLocation.lng}` },
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(visits);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=visits-report.csv');
  res.send(csv);
};
