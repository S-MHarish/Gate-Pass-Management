'use client';

import React from 'react';
import { GatePass, HostelInfo, Student } from '@/types';
import { DEFAULT_HOSTEL_INFO } from '@/lib/seedData';

interface PrintableGatePassProps {
  pass: GatePass;
  hostelInfo?: HostelInfo;
  isPrintOnly?: boolean;
}

interface RoomGroup {
  roomNo: string;
  students: Student[];
}

// Group consecutive students by room number
function groupStudentsByRoom(students: Student[]): RoomGroup[] {
  const sorted = [...students].sort((a, b) => {
    const rA = parseInt(a.roomNo, 10);
    const rB = parseInt(b.roomNo, 10);
    if (!isNaN(rA) && !isNaN(rB) && rA !== rB) {
      return rA - rB;
    }
    return a.roomNo.localeCompare(b.roomNo);
  });

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

export const PrintableGatePass: React.FC<PrintableGatePassProps> = ({
  pass,
  hostelInfo = DEFAULT_HOSTEL_INFO,
  isPrintOnly = false,
}) => {
  // Separate students by year
  const thirdYearStudents = pass.students.filter((s) => s.year === 'III');
  const secondYearStudents = pass.students.filter((s) => s.year === 'II');
  const otherStudents = pass.students.filter(
    (s) => s.year !== 'III' && s.year !== 'II'
  );

  const thirdYearGroups = groupStudentsByRoom(thirdYearStudents);
  const secondYearGroups = groupStudentsByRoom(secondYearStudents);
  const otherGroups = groupStudentsByRoom(otherStudents);

  let currentSNo = 1;

  return (
    <div
      className={`bg-white text-black font-sans w-full max-w-[210mm] mx-auto p-6 sm:p-8 shadow-2xl border border-gray-300 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full ${
        isPrintOnly ? 'hidden print:block' : 'block'
      }`}
      style={{ minHeight: '297mm', boxSizing: 'border-box' }}
    >
      {/* College Official Header - EXACT TEXT */}
      <div className="text-center space-y-0.5 mb-4">
        <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">
          {hostelInfo.collegeName || 'VSB ENGINEERING COLLEGE, KARUR'}
        </h1>
        <h2 className="text-sm sm:text-base font-bold">
          {hostelInfo.hostelName || 'Boys Hostel-I (New Construction First Floor)'}
        </h2>
        <h3 className="text-xs sm:text-sm font-bold underline tracking-tight">
          {hostelInfo.passTitle || 'Common Gate Pass (II & III Year)'}
        </h3>
      </div>

      {/* Official Table */}
      <div className="w-full">
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="text-black font-bold uppercase text-[11px] sm:text-xs">
              <th className="border border-black py-1.5 px-1.5 text-center w-12 font-bold">
                S.NO.
              </th>
              <th className="border border-black py-1.5 px-1.5 text-center w-20 font-bold">
                ROOM NO.
              </th>
              <th className="border border-black py-1.5 px-2 text-center font-bold">
                NAME OF THE STUDENT
              </th>
              <th className="border border-black py-1.5 px-1.5 text-center w-20 font-bold">
                DEPT
              </th>
              <th className="border border-black py-1.5 px-2 text-center w-36 font-bold">
                STUDENT SIGNATURE
              </th>
            </tr>
          </thead>
          <tbody>
            {/* III-YEAR Section */}
            {thirdYearGroups.length > 0 && (
              <>
                <tr className="bg-gray-100 print:bg-gray-100 font-bold">
                  <td
                    colSpan={5}
                    className="border border-black py-1 px-2 text-center uppercase tracking-wide text-xs font-bold"
                  >
                    III-YEAR
                  </td>
                </tr>
                {thirdYearGroups.map((group) => {
                  return group.students.map((student, idx) => {
                    const sNo = currentSNo++;
                    return (
                      <tr key={student.id || `iii-${sNo}`}>
                        <td className="border border-black py-1 px-1.5 text-center font-medium">
                          {sNo}
                        </td>
                        
                        {/* Merged Room No Cell - exactly centered vertically and horizontally */}
                        {idx === 0 && (
                          <td
                            rowSpan={group.students.length}
                            className="border border-black py-1 px-1.5 text-center align-middle font-bold"
                          >
                            {group.roomNo}
                          </td>
                        )}

                        <td className="border border-black py-1 px-2 text-left font-medium uppercase">
                          {student.name}
                        </td>
                        <td className="border border-black py-1 px-1.5 text-center font-medium">
                          {student.department}
                        </td>
                        <td className="border border-black py-1 px-2 text-center h-7">
                          {/* Blank for signature */}
                        </td>
                      </tr>
                    );
                  });
                })}
              </>
            )}

            {/* II-YEAR Section */}
            {secondYearGroups.length > 0 && (
              <>
                <tr className="bg-gray-100 print:bg-gray-100 font-bold">
                  <td
                    colSpan={5}
                    className="border border-black py-1 px-2 text-center uppercase tracking-wide text-xs font-bold"
                  >
                    II-YEAR
                  </td>
                </tr>
                {secondYearGroups.map((group) => {
                  return group.students.map((student, idx) => {
                    const sNo = currentSNo++;
                    return (
                      <tr key={student.id || `ii-${sNo}`}>
                        <td className="border border-black py-1 px-1.5 text-center font-medium">
                          {sNo}
                        </td>

                        {/* Merged Room No Cell */}
                        {idx === 0 && (
                          <td
                            rowSpan={group.students.length}
                            className="border border-black py-1 px-1.5 text-center align-middle font-bold"
                          >
                            {group.roomNo}
                          </td>
                        )}

                        <td className="border border-black py-1 px-2 text-left font-medium uppercase">
                          {student.name}
                        </td>
                        <td className="border border-black py-1 px-1.5 text-center font-medium">
                          {student.department}
                        </td>
                        <td className="border border-black py-1 px-2 text-center h-7">
                          {/* Blank for signature */}
                        </td>
                      </tr>
                    );
                  });
                })}
              </>
            )}

            {/* Fallback for other students */}
            {otherGroups.length > 0 && (
              <>
                {thirdYearGroups.length === 0 && secondYearGroups.length === 0 ? null : (
                  <tr className="bg-gray-100 print:bg-gray-100 font-bold">
                    <td
                      colSpan={5}
                      className="border border-black py-1 px-2 text-center uppercase tracking-wide text-xs font-bold"
                    >
                      OTHER STUDENTS
                    </td>
                  </tr>
                )}
                {otherGroups.map((group) => {
                  return group.students.map((student, idx) => {
                    const sNo = currentSNo++;
                    return (
                      <tr key={student.id || `other-${sNo}`}>
                        <td className="border border-black py-1 px-1.5 text-center font-medium">
                          {sNo}
                        </td>

                        {idx === 0 && (
                          <td
                            rowSpan={group.students.length}
                            className="border border-black py-1 px-1.5 text-center align-middle font-bold"
                          >
                            {group.roomNo}
                          </td>
                        )}

                        <td className="border border-black py-1 px-2 text-left font-medium uppercase">
                          {student.name}
                        </td>
                        <td className="border border-black py-1 px-1.5 text-center font-medium">
                          {student.department}
                        </td>
                        <td className="border border-black py-1 px-2 text-center h-7">
                          {/* Blank */}
                        </td>
                      </tr>
                    );
                  });
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Official Signatures Section at bottom - ONLY ASST. WARDEN and DEPUTY WARDEN */}
      <div className="mt-14 pt-4 flex justify-between items-end text-xs sm:text-sm font-bold uppercase tracking-wider">
        <div className="text-center">
          <p>{hostelInfo.asstWarden || 'ASST. WARDEN'}</p>
        </div>
        <div className="text-center">
          <p>{hostelInfo.deputyWarden || 'DEPUTY WARDEN'}</p>
        </div>
      </div>
    </div>
  );
};
