import dotenv from "dotenv";
dotenv.config();

import Employee from "../v1/models/employee.model.js";
import connectDB from "../config/connectDB.js";
import { hashPassword } from "../utils/validationUtils.js";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

// Tenant Id: 68602a1efdce0994c61019ac
// Level Id: 68602b12fdce0994c61019c0

const tenantId = "68602a1efdce0994c61019ac";
const levelId = "68602b12fdce0994c61019c0";

// Fetch all candidates
async function extractEmployees() {
  console.log("Extracting...");

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wbPath = path.resolve(__dirname, "../data/stanbic_data.xlsx");
    const workbook = xlsx.readFile(wbPath);

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    if (!rows.length) {
      console.warn("No rows found in spreadsheet - nothing to import.");
      return;
    }

    // console.log({
    //   staff_id: rows[0]["ICS Staff ID"],
    //   email: rows[0].Email,
    //   name: rows[0]["First Name"],
    //   middlename: rows[0]["Middle Name"],
    //   surname: rows[0].Surname,
    //   gender: rows[0].Gender,
    // });

    const employees = rows; // Default to an empty array if data is undefined

    await Promise.all(
      employees.map(async (employee) => {
        try {
          const existing = await Employee.findOne({
            $or: [
              //   {
              //     staffId: employee["ICS Staff ID"]
              //       ? employee["ICS Staff ID"]
              //       : null,
              //   },
              { email: employee.email },
            ],
          });

          if (existing) {
            console.log(
              `Employee with staffId ${employee.staff_id} already exists. Skipping...`
            );
            return;
          }

          const hashedPassword = await hashPassword("pass12345");

          const newEmployee = await Employee.create({
            tenantId,
            staffId: employee["ICS Staff ID"] ? employee["ICS Staff ID"] : null,
            firstname: employee["First Name"],
            middlename: employee["Middle Name"],
            surname: employee.Surname,
            gender:
              employee?.Gender.trim().toLowerCase() === "m" ? "male" : "female",
            email: employee.Email,
            password: hashedPassword,
            isEmailVerified: true,
            // levelId: "68602b12fdce0994c61019c0",
          });

          console.log(`${newEmployee.gender}`);

          console.log(
            `Created new employee ${newEmployee.firstname} ${newEmployee.middlename} ${newEmployee.surname} with Id ${newEmployee._id} and staffId: ${newEmployee.staffId}`
          );
        } catch (error) {
          console.error(
            `Error creating employee with staffId ${employee.staff_id}`,
            error
          );
        }
      })
    );

    console.log("Employees created successfully");
  } catch (error) {
    console.error("Error extracting stanbic employees:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
  }
}

async function updateEmployeesLevel() {
  try {
    console.log("Updating employees' levelId...");

    // Fetch all employees in the tenant and use findOneAndUpdate to update each one
    const employees = await Employee.find({ tenantId });

    console.log(`Found ${employees.length} employee(s). Updating...`);

    for (const employee of employees) {
      const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: employee._id }, // Find employee by _id
        { levelId: levelId }, // Update levelId
        { new: true } // Return the updated document
      );

      console.log(`Employee ${updatedEmployee._id} updated successfully.`);
    }

    console.log("Successfully updated employees' levelId.");
  } catch (error) {
    console.error("Error updating employees:", {
      message: error.message,
      stack: error.stack,
    });
  }
}

async function populateDatabase() {
  try {
    console.log("Connecting to database...");
    await connectDB(process.env.DB_URI);
    console.log("Database connected successfully");
    await extractEmployees();
    await updateEmployeesLevel();
  } catch (error) {
    console.error("Error populating database:", {
      message: error.message,
      stack: error.stack,
    });
  }
}

populateDatabase();
