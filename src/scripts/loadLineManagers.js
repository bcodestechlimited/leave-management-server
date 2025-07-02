import dotenv from "dotenv";
dotenv.config();

import Employee from "../v1/models/employee.model.js";
import connectDB from "../config/connectDB.js";
import { hashPassword } from "../utils/validationUtils.js";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

// Tenant Id: 6800a6704cc8c7225a28c870 - MoniePoint
const tenantId = "6800a6704cc8c7225a28c870";

// Fetch all candidates
async function extractLineManagers() {
  console.log("Connecting to database...");
  await connectDB(process.env.DB_URI);
  console.log("Database connected successfully");
  console.log("Extracting...");

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wbPath = path.resolve(__dirname, "../data/book2.xlsx");
    const workbook = xlsx.readFile(wbPath);

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    if (!rows.length) {
      console.warn("No rows found in spreadsheet - nothing to import.");
      return;
    }

    console.log({ rows });

    const lineManagers = rows; // Default to an empty array if data is undefined

    await Promise.all(
      lineManagers.map(async (lineManager) => {
        try {
          const existing = await Employee.findOne({
            $or: [
              //   {
              //     staffId: lineManager["ICS Staff ID"]
              //       ? employee["ICS Staff ID"]
              //       : null,
              //   },
              { email: lineManager["EMAIL ADRESS"] },
            ],
          });

          if (existing) {
            console.log(
              `Line manager with staffId ${lineManager.staff_id} already exists. Skipping...`
            );
            return;
          }

          const hashedPassword = await hashPassword("pass12345");

          const newLineManager = await Employee.create({
            tenantId,
            staffId: lineManager["ICS Staff ID"]
              ? lineManager["ICS Staff ID"]
              : null,
            firstname: lineManager.NAME.split(" ")[0],
            middlename: "",
            surname: lineManager.NAME.split(" ")[1] || "",
            gender: "male",
            email: lineManager["EMAIL ADRESS"],
            password: hashedPassword,
            isEmailVerified: true,
            accountType: "lineManager",
          });

          console.log(`${newLineManager.gender}`);

          console.log(
            `Created new employee ${newLineManager.firstname} ${newLineManager.middlename} ${newLineManager.surname} with Id ${newLineManager._id} and staffId: ${newLineManager.staffId}`
          );
        } catch (error) {
          console.error(
            `Error creating employee with staffId ${lineManager.staff_id}`,
            error
          );
        }
      })
    );

    console.log("Line managers created successfully");
  } catch (error) {
    console.error("Error extracting line managers from spreadsheet:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
  }
}

// Run the function
extractLineManagers();
