import * as XLSX from 'xlsx';
import { saveBlobFile } from '@/lib/fileSaver';
import { Student } from '@/types';

export const exportStudentsToExcel = (students: Student[], filename = 'Hostel_Master_Students.xlsx'): void => {
  const exportData = students.map((s, idx) => ({
    'S.No': s.sNo || idx + 1,
    'Room No': s.roomNo,
    'Name': s.name,
    'Department': s.department,
    'Year': s.year,
    'Parent Phone': s.parentPhone || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Students');

  worksheet['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 12 }, // Room No
    { wch: 28 }, // Name
    { wch: 14 }, // Dept
    { wch: 10 }, // Year
    { wch: 22 }, // Parent Phone
  ];

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveBlobFile(blob, filename);
};

export const exportStudentsToCSV = (students: Student[], filename = 'hostel_members_97.csv'): void => {
  const exportData = students.map((s, idx) => ({
    'S.No': s.sNo || idx + 1,
    'Room No': s.roomNo,
    'Name': s.name,
    'Department': s.department,
    'Year': s.year,
    'Parent Phone': s.parentPhone || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  saveBlobFile(blob, filename);
};

export const downloadSampleExcelTemplate = (): void => {
  const sampleCsv = `S.No,Room No,Name,Department,Year,Parent Phone\n1,1,MUTHAMIZHSELVAN.M,CSBS,III,9876543210\n2,1,VISHWA.S,CSBS,III,9876543211\n3,2,KAVIN.J,CSE,III,9876543212\n4,13,KARTHIKEYAN.K,EEE,II,9876543213`;
  const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
  saveBlobFile(blob, 'hostel_members_template.csv');
};

export const parseStudentsFromExcel = async (file: File): Promise<{ students: Omit<Student, 'id' | 'sNo'>[]; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedStudents: Omit<Student, 'id' | 'sNo'>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, index) => {
          // Normalize column headers
          const room = String(row['Room No'] || row['Room'] || row['ROOM NO'] || row['room'] || row['RoomNo'] || '').trim();
          const name = String(row['Name'] || row['Student Name'] || row['NAME'] || row['NAME OF THE STUDENT'] || row['name'] || '').trim();
          const dept = String(row['Department'] || row['Dept'] || row['DEPT'] || row['department'] || 'CSE').trim();
          const yearRaw = String(row['Year'] || row['YEAR'] || row['year'] || 'III').trim().toUpperCase();
          const phone = String(row['Parent Phone Number'] || row['Parent Phone'] || row['Parent No'] || row['PARENT NO.'] || row['Phone'] || '').trim();

          if (!name) {
            errors.push(`Row ${index + 2}: Missing student name (skipped)`);
            return;
          }

          let validYear: 'I' | 'II' | 'III' | 'IV' = 'III';
          if (['I', '1', '1ST', 'FIRST'].includes(yearRaw)) validYear = 'I';
          else if (['II', '2', '2ND', 'SECOND'].includes(yearRaw)) validYear = 'II';
          else if (['III', '3', '3RD', 'THIRD'].includes(yearRaw)) validYear = 'III';
          else if (['IV', '4', '4TH', 'FINAL'].includes(yearRaw)) validYear = 'IV';

          parsedStudents.push({
            roomNo: room || '1',
            name: name.toUpperCase(),
            department: dept.toUpperCase() || 'CSE',
            year: validYear,
            parentPhone: phone || '',
          });
        });

        resolve({ students: parsedStudents, errors });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
