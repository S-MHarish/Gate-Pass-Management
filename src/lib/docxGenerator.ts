import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  WidthType,
  HeightRule,
  ShadingType,
  VerticalMergeType,
  VerticalAlign,
} from 'docx';
import { saveBlobFile } from '@/lib/fileSaver';
import { GatePass, HostelInfo, Student } from '@/types';
import { DEFAULT_HOSTEL_INFO } from './seedData';
import { compareRoomNumbers } from './roomUtils';

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

export const generateGatePassDocx = async (
  pass: GatePass,
  hostelInfo: HostelInfo = DEFAULT_HOSTEL_INFO
): Promise<Blob> => {
  const tableRows: TableRow[] = [];
  const includePhone = Boolean(pass.includeParentPhone);

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

  // Table Header Row
  const headerCells = includePhone
    ? [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'S.NO.', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'ROOM NO.', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 38, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NAME OF THE STUDENT', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'DEPT', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'PARENT NO.', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'STUDENT SIGNATURE', bold: true, size: 18 })],
            }),
          ],
        }),
      ]
    : [
        new TableCell({
          width: { size: 9, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'S.NO.', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 13, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'ROOM NO.', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 46, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NAME OF THE STUDENT', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'DEPT', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'STUDENT SIGNATURE', bold: true, size: 18 })],
            }),
          ],
        }),
      ];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      height: { value: 340, rule: HeightRule.ATLEAST },
      children: headerCells,
    })
  );

  // Helper to add student rows
  const addGroupRows = (groups: RoomGroup[], sectionTitle?: string) => {
    if (groups.length === 0) return;

    if (sectionTitle) {
      tableRows.push(
        new TableRow({
          height: { value: 300, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              columnSpan: includePhone ? 6 : 5,
              shading: { fill: 'EFEFEF', type: ShadingType.CLEAR },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: sectionTitle, bold: true, size: 18 })],
                }),
              ],
            }),
          ],
        })
      );
    }

    groups.forEach((group) => {
      group.students.forEach((student, idx) => {
        const sNo = currentSNo++;
        const isFirstInRoom = idx === 0;

        const rowCells = [
          // S.NO. Cell
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${sNo}`, size: 18 })],
              }),
            ],
          }),

          // ROOM NO. Cell
          new TableCell({
            verticalMerge: isFirstInRoom
              ? VerticalMergeType.RESTART
              : VerticalMergeType.CONTINUE,
            verticalAlign: VerticalAlign.CENTER,
            children: isFirstInRoom
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: group.roomNo,
                        bold: true,
                        size: 18,
                      }),
                    ],
                  }),
                ]
              : [],
          }),

          // NAME OF THE STUDENT Cell
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: (student.name || '').toUpperCase(),
                    size: 18,
                  }),
                ],
              }),
            ],
          }),

          // DEPT Cell
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (student.department || '').toUpperCase(),
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        ];

        if (includePhone) {
          rowCells.push(
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: student.parentPhone || '',
                      size: 18,
                    }),
                  ],
                }),
              ],
            })
          );
        }

        // Signature Cell
        rowCells.push(
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '', size: 18 })],
              }),
            ],
          })
        );

        tableRows.push(
          new TableRow({
            height: { value: 280, rule: HeightRule.ATLEAST },
            children: rowCells,
          })
        );
      });
    });
  };

  addGroupRows(thirdYearGroups, thirdYearGroups.length > 0 ? 'III-YEAR' : undefined);
  addGroupRows(secondYearGroups, secondYearGroups.length > 0 ? 'II-YEAR' : undefined);
  addGroupRows(otherGroups, otherGroups.length > 0 && (thirdYearGroups.length > 0 || secondYearGroups.length > 0) ? 'OTHER STUDENTS' : undefined);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: (hostelInfo.collegeName || 'VSB ENGINEERING COLLEGE, KARUR').toUpperCase(),
                bold: true,
                size: 24,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: hostelInfo.hostelName || 'Boys Hostel-I (New Construction First Floor)',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: hostelInfo.passTitle || 'Common Gate Pass (II & III Year)',
                bold: true,
                underline: {},
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({
            alignment: AlignmentType.BOTH,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: (hostelInfo.asstWarden || 'ASST. WARDEN').toUpperCase(),
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: ' '.repeat(55),
              }),
              new TextRun({
                text: (hostelInfo.deputyWarden || 'DEPUTY WARDEN').toUpperCase(),
                bold: true,
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
};

export const downloadGatePassDocx = async (
  pass: GatePass,
  hostelInfo: HostelInfo = DEFAULT_HOSTEL_INFO
): Promise<void> => {
  const blob = await generateGatePassDocx(pass, hostelInfo);
  const cleanDate = (pass.formattedDate || pass.date).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `GATE_PASS_${cleanDate}.docx`;
  saveBlobFile(blob, filename);
};
