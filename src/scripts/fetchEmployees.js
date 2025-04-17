import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

import Employee from "../v1/models/employee.model.js";
import connectDB from "../config/connectDB.js";

// Tenant Id: 6800a6704cc8c7225a28c870

// Fetch all candidates
async function fetchEmployees() {
  if (!process.env.ATS_KEY) {
    throw new Error("ATS_KEY is not set in the environment variables.");
  }
  console.log("Fetching moniePoint employees...");

  try {
    const response = await axios.get(
      "https://icsjobportal.com/api/moniepoint/",
      {
        headers: {
          Authorization: process.env.ATS_KEY,
        },
      }
    );

    console.log({ data: response?.data });

    console.log("MoniePoint employees retrieved successfully");
    console.log("Connecting to database...");
    await connectDB(process.env.DB_URI);
    console.log("Database connected successfully");
    console.log("Creating Employees...");

    const employees = response?.data || []; // Default to an empty array if data is undefined

    await Promise.all(
      employees.map(async (employee) => {
        try {
          const newEmployee = await Employee.create({
            tenantId: "6800a6704cc8c7225a28c870",
            staffId: employee.staff_id,
            firstname: employee.firstname,
            middlename: employee.middlename,
            surname: employee.surname,
            email: employee.email_address,
            password: "pass12345",
            atsInfo: employee,
          });

          console.log(
            `Created new employee ${newEmployee.firstname} with Id ${newEmployee._id} and staffId: ${newEmployee.staffId}`
          );
        } catch (error) {
          console.error(`Error creating employee ${employee.name}`, error);
        }
      })
    );

    console.log("Employees created successfully");
  } catch (error) {
    console.error("Error Fetching moniePoint employees:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
  }
}

fetchEmployees();
