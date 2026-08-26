import { Student, HostelInfo } from '@/types';

export const DEFAULT_HOSTEL_INFO: HostelInfo = {
  collegeName: 'VSB ENGINEERING COLLEGE, KARUR',
  hostelName: 'Boys Hostel-I (New Construction First Floor)',
  passTitle: 'Common Gate Pass (II & III Year)',
  floorInfo: 'First Floor - New Block',
  asstWarden: 'ASST. WARDEN',
  deputyWarden: 'DEPUTY WARDEN',
  phoneContact: '+91 94433 12345',
};

// Exact Master Database populated directly from hostel_members_97.csv
export const INITIAL_STUDENTS: Student[] = [
  // Room 1 (5 students - III Year)
  { id: 'std-1', sNo: 1, roomNo: '1', name: 'MUTHAMIZHSELVAN.M', department: 'CSBS', year: 'III', parentPhone: '' },
  { id: 'std-2', sNo: 2, roomNo: '1', name: 'VISHWA.S', department: 'CSBS', year: 'III', parentPhone: '' },
  { id: 'std-3', sNo: 3, roomNo: '1', name: 'RAJESH.M', department: 'CSBS', year: 'III', parentPhone: '' },
  { id: 'std-4', sNo: 4, roomNo: '1', name: 'PARANIDARAN.R', department: 'CSBS', year: 'III', parentPhone: '' },
  { id: 'std-5', sNo: 5, roomNo: '1', name: 'MOHAMEED THAGA SAFEEK', department: 'CSBS', year: 'III', parentPhone: '' },

  // Room 2 (5 students - III Year)
  { id: 'std-6', sNo: 6, roomNo: '2', name: 'KAVIN.J', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-7', sNo: 7, roomNo: '2', name: 'GAJENDHARAN.A', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-8', sNo: 8, roomNo: '2', name: 'DINESH.S', department: 'AIML', year: 'III', parentPhone: '' },
  { id: 'std-9', sNo: 9, roomNo: '2', name: 'SIVAKUMAR.J', department: 'AIDS', year: 'III', parentPhone: '' },
  { id: 'std-10', sNo: 10, roomNo: '2', name: 'HEMANATH.S.G', department: 'CSE', year: 'III', parentPhone: '' },

  // Room 3 (5 students - III Year)
  { id: 'std-11', sNo: 11, roomNo: '3', name: 'GOUKULRAJ.R', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-12', sNo: 12, roomNo: '3', name: 'ELANITHI.K', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-13', sNo: 13, roomNo: '3', name: 'HARIHARAN.V', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-14', sNo: 14, roomNo: '3', name: 'HABIBUR RAHMAN.M', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-15', sNo: 15, roomNo: '3', name: 'KALAIMANI.S', department: 'CSE', year: 'III', parentPhone: '' },

  // Room 4 (5 students - III Year)
  { id: 'std-16', sNo: 16, roomNo: '4', name: 'KARTHIK RAJALEE.S', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-17', sNo: 17, roomNo: '4', name: 'SERAN.M', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-18', sNo: 18, roomNo: '4', name: 'SIVAGANESH.J', department: 'AIDS', year: 'III', parentPhone: '' },
  { id: 'std-19', sNo: 19, roomNo: '4', name: 'YOGESHWARAN.R', department: 'AIDS', year: 'III', parentPhone: '' },
  { id: 'std-20', sNo: 20, roomNo: '4', name: 'PRADEEP KUMAR.M', department: 'AIDS', year: 'III', parentPhone: '' },

  // Room 5 (5 students - III Year)
  { id: 'std-21', sNo: 21, roomNo: '5', name: 'SANTHOSH.M', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-22', sNo: 22, roomNo: '5', name: 'SANJAY SRINIVAS.B', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-23', sNo: 23, roomNo: '5', name: 'PRAVEEN KUMAR.S', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-24', sNo: 24, roomNo: '5', name: 'REYAS.B', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-25', sNo: 25, roomNo: '5', name: 'RAGUL.S', department: 'CSE', year: 'III', parentPhone: '' },

  // Room 6 (5 students - III Year)
  { id: 'std-26', sNo: 26, roomNo: '6', name: 'NITHEESH.P', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-27', sNo: 27, roomNo: '6', name: 'MURUGAN.K', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-28', sNo: 28, roomNo: '6', name: 'SANJAYKUMAR.G.S', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-29', sNo: 29, roomNo: '6', name: 'VISHNU.M.S', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-30', sNo: 30, roomNo: '6', name: 'MOHAMED ALTHAP.S', department: 'ECE', year: 'III', parentPhone: '' },

  // Room 7 (4 students - III Year)
  { id: 'std-31', sNo: 31, roomNo: '7', name: 'GOKUL RAM.K', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-32', sNo: 32, roomNo: '7', name: 'ELANGO.V', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-33', sNo: 33, roomNo: '7', name: 'DHARANIDHARAN.S', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-34', sNo: 34, roomNo: '7', name: 'SANJAY.G', department: 'ECE', year: 'III', parentPhone: '' },

  // Room 8 (5 students - III Year)
  { id: 'std-35', sNo: 35, roomNo: '8', name: 'NAGARAJ.V', department: 'IT', year: 'III', parentPhone: '' },
  { id: 'std-36', sNo: 36, roomNo: '8', name: 'ARIVANANTHAM.N', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-37', sNo: 37, roomNo: '8', name: 'BALAVIGNESH.K', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-38', sNo: 38, roomNo: '8', name: 'THANA.G.K', department: 'CSE', year: 'III', parentPhone: '' },
  { id: 'std-39', sNo: 39, roomNo: '8', name: 'DHAYANITHI.K', department: 'CSE', year: 'III', parentPhone: '' },

  // Room 9 (4 students - III Year)
  { id: 'std-40', sNo: 40, roomNo: '9', name: 'ANGUABISHEK.M', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-41', sNo: 41, roomNo: '9', name: 'SIDDHARTH.K', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-42', sNo: 42, roomNo: '9', name: 'VIJAYVARMA.V', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-43', sNo: 43, roomNo: '9', name: 'HEAMSUNDAR.B', department: 'ECE', year: 'III', parentPhone: '' },

  // Room 10 (5 students - III Year)
  { id: 'std-44', sNo: 44, roomNo: '10', name: 'SIVASRADEEP.S', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-45', sNo: 45, roomNo: '10', name: 'DIGANTH.J', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-46', sNo: 46, roomNo: '10', name: 'MOHAMED HARISH.S', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-47', sNo: 47, roomNo: '10', name: 'RUBAHAN.P', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-48', sNo: 48, roomNo: '10', name: 'MUGILAN.B', department: 'ECE', year: 'III', parentPhone: '' },

  // Room 11 (5 students - III Year)
  { id: 'std-49', sNo: 49, roomNo: '11', name: 'PURUSOTHAMAN.K', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-50', sNo: 50, roomNo: '11', name: 'ASHWATH.P', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-51', sNo: 51, roomNo: '11', name: 'DIVAGARSHAN.M', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-52', sNo: 52, roomNo: '11', name: 'GOPINATH.P.D', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-53', sNo: 53, roomNo: '11', name: 'GOKUL.P', department: 'ECE', year: 'III', parentPhone: '' },

  // Room 12 (5 students - III Year)
  { id: 'std-54', sNo: 54, roomNo: '12', name: 'RAVI NITHISH KUMAR.S', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-55', sNo: 55, roomNo: '12', name: 'BHARATH.P', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-56', sNo: 56, roomNo: '12', name: 'SANTHOSH.D', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-57', sNo: 57, roomNo: '12', name: 'THANZEEL.R', department: 'ECE', year: 'III', parentPhone: '' },
  { id: 'std-58', sNo: 58, roomNo: '12', name: 'RAGUL.S', department: 'ECE', year: 'III', parentPhone: '' },

  // Room 13 (3 students - II Year)
  { id: 'std-59', sNo: 59, roomNo: '13', name: 'KARTHIKEYAN.K', department: 'EEE', year: 'II', parentPhone: '' },
  { id: 'std-60', sNo: 60, roomNo: '13', name: 'DHARANEESH.R', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-61', sNo: 61, roomNo: '13', name: 'AIRNEST ANTONY.S', department: 'CIVIL', year: 'II', parentPhone: '' },

  // Room 15 (3 students - II Year)
  { id: 'std-62', sNo: 62, roomNo: '15', name: 'SIVAMANIKANDAN.K', department: 'ECE', year: 'II', parentPhone: '' },
  { id: 'std-63', sNo: 63, roomNo: '15', name: 'VINOTH KUMAR.B', department: 'EEE', year: 'II', parentPhone: '' },
  { id: 'std-64', sNo: 64, roomNo: '15', name: 'KUMARAKURUBARAN.C', department: 'EEE', year: 'II', parentPhone: '' },

  // Room 16 (5 students - II Year)
  { id: 'std-65', sNo: 65, roomNo: '16', name: 'SELVAPRASATH.C', department: 'ECE', year: 'II', parentPhone: '' },
  { id: 'std-66', sNo: 66, roomNo: '16', name: 'JAIGANESH.K', department: 'MECH', year: 'II', parentPhone: '' },
  { id: 'std-67', sNo: 67, roomNo: '16', name: 'GANESH.S', department: 'MECH', year: 'II', parentPhone: '' },
  { id: 'std-68', sNo: 68, roomNo: '16', name: 'PARTHA SARATHI.G', department: 'MECH', year: 'II', parentPhone: '' },
  { id: 'std-69', sNo: 69, roomNo: '16', name: 'GIRIVASAN.M', department: 'MECH', year: 'II', parentPhone: '' },

  // Room 17 (4 students - II Year)
  { id: 'std-70', sNo: 70, roomNo: '17', name: 'KISHORE.R', department: 'MECH', year: 'II', parentPhone: '' },
  { id: 'std-71', sNo: 71, roomNo: '17', name: 'SAMJAISON.N', department: 'MECH', year: 'II', parentPhone: '' },
  { id: 'std-72', sNo: 72, roomNo: '17', name: 'ARAVINTH.G', department: 'MECH', year: 'II', parentPhone: '' },
  { id: 'std-73', sNo: 73, roomNo: '17', name: 'NAVEEN KUMAR', department: 'MECH', year: 'II', parentPhone: '' },

  // Room 18 (5 students - II Year)
  { id: 'std-74', sNo: 74, roomNo: '18', name: 'ASHIBAZ DANY.R', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-75', sNo: 75, roomNo: '18', name: 'DAVID SANJAY.M', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-76', sNo: 76, roomNo: '18', name: 'DEEPAK.M', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-77', sNo: 77, roomNo: '18', name: 'DHARESH.A.G', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-78', sNo: 78, roomNo: '18', name: 'DHARNASH.V', department: 'CSE', year: 'II', parentPhone: '' },

  // Room 19 (5 students - II Year)
  { id: 'std-79', sNo: 79, roomNo: '19', name: 'GOKULRAJ.S', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-80', sNo: 80, roomNo: '19', name: 'GUHAN.A', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-81', sNo: 81, roomNo: '19', name: 'GURU PRASATH.K', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-82', sNo: 82, roomNo: '19', name: 'HARIHARAN.M', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-83', sNo: 83, roomNo: '19', name: 'BARANIDHARAN.N', department: 'CSE', year: 'II', parentPhone: '' },

  // Room 20 (4 students - II Year)
  { id: 'std-84', sNo: 84, roomNo: '20', name: 'MICHEL JENISH.J', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-85', sNo: 85, roomNo: '20', name: 'ARJUN.E', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-86', sNo: 86, roomNo: '20', name: 'SARVESH', department: 'AIDS', year: 'II', parentPhone: '' },
  { id: 'std-87', sNo: 87, roomNo: '20', name: 'YUVARAJAN.S', department: 'AIDS', year: 'II', parentPhone: '' },

  // Room 21 (5 students - II Year)
  { id: 'std-88', sNo: 88, roomNo: '21', name: 'GANESH.A', department: 'EEE', year: 'II', parentPhone: '' },
  { id: 'std-89', sNo: 89, roomNo: '21', name: 'JEEVA.J', department: 'EEE', year: 'II', parentPhone: '' },
  { id: 'std-90', sNo: 90, roomNo: '21', name: 'SIPITHARAN.S', department: 'EEE', year: 'II', parentPhone: '' },
  { id: 'std-91', sNo: 91, roomNo: '21', name: 'SREE AAKASH.S.A', department: 'EEE', year: 'II', parentPhone: '' },
  { id: 'std-92', sNo: 92, roomNo: '21', name: 'SANJAI SRIRAM.S.P', department: 'EEE', year: 'II', parentPhone: '' },

  // Room 22 (5 students - II Year)
  { id: 'std-93', sNo: 93, roomNo: '22', name: 'MITHUN SRINIVAS.R', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-94', sNo: 94, roomNo: '22', name: 'SARANEESH.S', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-95', sNo: 95, roomNo: '22', name: 'SANTHOSH BALAJI.N', department: 'CSE', year: 'II', parentPhone: '' },
  { id: 'std-96', sNo: 96, roomNo: '22', name: 'GURU DEV.G', department: 'EEE', year: 'II', parentPhone: '' },
  { id: 'std-97', sNo: 97, roomNo: '22', name: 'SOWMAN.K.M', department: 'EEE', year: 'II', parentPhone: '' },
];
