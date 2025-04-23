import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

import Employee from "../v1/models/employee.model.js";
import connectDB from "../config/connectDB.js";
import { hashPassword } from "../utils/validationUtils.js";

// Tenant Id: 6800a6704cc8c7225a28c870

// Fetch all candidates
// async function fetchEmployees() {
//   if (!process.env.ATS_KEY) {
//     throw new Error("ATS_KEY is not set in the environment variables.");
//   }
//   console.log("Fetching moniePoint employees...");

//   try {
//     const response = await axios.get(
//       "https://icsjobportal.com/api/moniepoint/",
//       {
//         headers: {
//           Authorization: process.env.ATS_KEY,
//         },
//       }
//     );

//     console.log({
//       data: response?.data,
//       dataAmount: response?.data?.length,
//     });

//     console.log("MoniePoint employees retrieved successfully");
//     console.log("Connecting to database...");
//     await connectDB(process.env.DB_URI);
//     console.log("Database connected successfully");
//     console.log("Creating Employees...");

//     const employees = response?.data || []; // Default to an empty array if data is undefined

//     await Promise.all(
//       employees.map(async (employee) => {
//         try {
//           // const staffId = employee.staff_id;

//           // if (!staffId) {
//           //   console.log(
//           //     `Skipping employee with missing or null staffId: ${employee.staff_id} ${employee.firstname} ${employee.middlename} ${employee.surname}`
//           //   );
//           //   return;
//           // }

//           // const existing = await Employee.findOne({
//           //   staffId: employee.staff_id,
//           // });

//           // if (existing) {
//           //   console.log(
//           //     `Employee with staffId ${employee.staff_id} already exists. Skipping...`
//           //   );
//           //   return;
//           // }

//           const hashedPassword = await hashPassword("pass12345");

//           const newEmployee = await Employee.create({
//             tenantId: "6800a6704cc8c7225a28c870",
//             staffId: employee.staff_id,
//             firstname: employee.firstname,
//             middlename: employee.middlename,
//             surname: employee.surname,
//             gender: employee.sex.trim().toLowerCase(),
//             email: employee.email_address,
//             password: hashedPassword,
//             atsInfo: employee,
//             isEmailVerified: true,
//           });

//           console.log(`${newEmployee.gender}`);

//           console.log(
//             `Created new employee ${newEmployee.firstname} ${newEmployee.middlename} ${newEmployee.surname} with Id ${newEmployee._id} and staffId: ${newEmployee.staffId}`
//           );
//         } catch (error) {
//           console.error(
//             `Error creating employee with staffId ${employee.staff_id}`,
//             error
//           );
//         }
//       })
//     );

//     console.log("Employees created successfully");
//   } catch (error) {
//     console.error("Error Fetching moniePoint employees:", {
//       message: error.message,
//       response: error.response?.data,
//       stack: error.stack,
//     });
//   }
// }

// fetchEmployees();

async function addLevel() {
  await connectDB(process.env.DB_URI);
  const employees = await Employee.find();
  await Promise.all(
    employees.map(async (employee) => {
      employee.levelId = "6808c8f6a5c956b618dd0d9d";
      await employee.save();
    })
  );

  console.log("Level added successfully");
  const firstFourEmployees = employees.slice(0, 4);
  firstFourEmployees.forEach((employee, index) => {
    console.log(`Employee ${index + 1}:`, {
      staffId: employee.staffId,
      firstname: employee.firstname,
      middlename: employee.middlename,
      surname: employee.surname,
      gender: employee.gender,
      email: employee.email,
      levelId: employee.levelId,
    });
  });
}

addLevel();
