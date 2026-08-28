import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { GatePass, HostelInfo, Student } from '@/types';
import { DEFAULT_HOSTEL_INFO } from './seedData';
import { compareRoomNumbers } from './storage';

interface RoomGroup {
  roomNo: string;
  students: Student[];
}

function groupStudentsByRoom(students: Student[]): RoomGroup[] {
  const sorted = [...students].sort((a, b) => compareRoomNumbers(a.roomNo, b.roomNo));

  const groups: RoomGroup[] = [];
  sorted.forEach((student) => {
    const last = groups[groups.length - 1];
    if (last && last.roomNo === student.roomNo) {
      last.students.push(student);
    } else {
      groups.push({
        roomNo: student.roomNo,
        students: [student],
      });
    }
  });
  return groups;
}

export const generateGatePassPDF = (
  pass: GatePass,
  hostelInfo: HostelInfo = DEFAULT_HOSTEL_INFO
): jsPDF => {
  // Create A4 portrait PDF (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Group students by year
  const thirdYearStudents = pass.students.filter((s) => s.year === 'III');
  const secondYearStudents = pass.students.filter((s) => s.year === 'II');
  const otherStudents = pass.students.filter(
    (s) => s.year !== 'III' && s.year !== 'II'
  );

  const thirdYearGroups = groupStudentsByRoom(thirdYearStudents);
  const secondYearGroups = groupStudentsByRoom(secondYearStudents);
  const otherGroups = groupStudentsByRoom(otherStudents);

  let currentSNo = 1;
  const tableRows: RowInput[] = [];

  const addGroupRows = (groups: RoomGroup[], sectionTitle?: string) => {
    if (groups.length === 0) return;

    if (sectionTitle) {
      tableRows.push([
        {
          content: sectionTitle,
          colSpan: 5,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontSize: 9,
          },
        },
      ]);
    }

    groups.forEach((group) => {
      const roomSpan = group.students.length;
      group.students.forEach((student, idx) => {
        const sNo = (currentSNo++).toString();
        if (idx === 0) {
          // First row contains the merged ROOM NO. cell
          tableRows.push([
            sNo,
            {
              content: group.roomNo,
              rowSpan: roomSpan,
              styles: {
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
              },
            },
            student.name.toUpperCase(),
            student.department.toUpperCase(),
            '', // Blank for Student Signature
          ]);
        } else {
          // Subsequent rows omit the spanned ROOM NO. cell
          tableRows.push([
            sNo,
            student.name.toUpperCase(),
            student.department.toUpperCase(),
            '',
          ]);
        }
      });
    });
  };

  addGroupRows(thirdYearGroups, thirdYearGroups.length > 0 ? 'III-YEAR' : undefined);
  addGroupRows(secondYearGroups, secondYearGroups.length > 0 ? 'II-YEAR' : undefined);
  addGroupRows(otherGroups, otherGroups.length > 0 && (thirdYearGroups.length > 0 || secondYearGroups.length > 0) ? 'OTHER STUDENTS' : undefined);

  // Use autoTable to build official document
  autoTable(doc, {
    head: [
      [
        { content: 'S.NO.', styles: { halign: 'center', cellWidth: 14 } },
        { content: 'ROOM NO.', styles: { halign: 'center', cellWidth: 22 } },
        { content: 'NAME OF THE STUDENT', styles: { halign: 'center', cellWidth: 84 } },
        { content: 'DEPT', styles: { halign: 'center', cellWidth: 22 } },
        { content: 'STUDENT SIGNATURE', styles: { halign: 'center', cellWidth: 40 } },
      ],
    ],
    body: tableRows,
    startY: 32,
    margin: { top: 32, left: margin, right: margin, bottom: 25 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 1.8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineWidth: 0.25,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'left' },
      3: { halign: 'center' },
      4: { halign: 'center', minCellHeight: 6.5 },
    },
    didDrawPage: () => {
      // Formal Exact Header on each page
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(
        (hostelInfo.collegeName || 'VSB ENGINEERING COLLEGE, KARUR').toUpperCase(),
        pageWidth / 2,
        12,
        { align: 'center' }
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(
        hostelInfo.hostelName || 'Boys Hostel-I (New Construction First Floor)',
        pageWidth / 2,
        17.5,
        { align: 'center' }
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const title = hostelInfo.passTitle || 'Common Gate Pass (II & III Year)';
      doc.text(title, pageWidth / 2, 23, { align: 'center' });
      
      // Underline for title
      const textWidth = doc.getTextWidth(title);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(
        (pageWidth - textWidth) / 2,
        24,
        (pageWidth + textWidth) / 2,
        24
      );
    },
  });

  // Footer Signatures on the final page
  const finalY = (doc as any).lastAutoTable.finalY || 240;
  const spaceRemaining = pageHeight - finalY;

  let signatureY = finalY + 18;
  if (spaceRemaining < 25) {
    doc.addPage();
    signatureY = 35;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);

  // Warden Signatures ONLY at the bottom
  doc.text((hostelInfo.asstWarden || 'ASST. WARDEN').toUpperCase(), margin + 10, signatureY);
  doc.text(
    (hostelInfo.deputyWarden || 'DEPUTY WARDEN').toUpperCase(),
    pageWidth - margin - 40,
    signatureY
  );

  return doc;
};

export const downloadGatePassPDF = (
  pass: GatePass,
  hostelInfo: HostelInfo = DEFAULT_HOSTEL_INFO
): void => {
  const doc = generateGatePassPDF(pass, hostelInfo);
  const cleanDate = (pass.formattedDate || pass.date).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `GATE_PASS_${cleanDate}.pdf`;
  doc.save(filename);
};

export const getGatePassPDFBlobUrl = (
  pass: GatePass,
  hostelInfo: HostelInfo = DEFAULT_HOSTEL_INFO
): string => {
  const doc = generateGatePassPDF(pass, hostelInfo);
  const url = doc.output('bloburl');
  return typeof url === 'string' ? url : (url as URL).toString();
};
