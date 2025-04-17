import express from "express";
import fileUpload from "express-fileupload";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./src/config/connectDB.js";
import notFound from "./src/middlewares/notFound.js";
import { errorMiddleware } from "./src/middlewares/error.js";

import adminRoutesV1 from "./src/v1/routes/admin.routes.js";
import employeeRoutesV1 from "./src/v1/routes/employee.routes.js";
import tenantRoutesV1 from "./src/v1/routes/tenant.routes.js";
import leaveRoutesV1 from "./src/v1/routes/leave.routes.js";
import levelRoutesV1 from "./src/v1/routes/level.routes.js";
import analyticsRoutesV1 from "./src/v1/routes/analytics.routes.js";
import clientRoutesV1 from "./src/v1/modules/client/client.routes.js";
// import superAdminRoutesV1 from "./src/v1/routes/superAdmin.routes.js";

//
import authRoutesV1 from "./src/v1/routes/auth.routes.js";

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors([{ origin: "*" }]));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);
app.use(morgan("dev"));

//Admin
app.use("/api/v1/admin", adminRoutesV1);
app.use("/api/v1/auth", authRoutesV1);

//Rest
app.use("/api/v1/employee", employeeRoutesV1);
app.use("/api/v1/tenant", tenantRoutesV1);
app.use("/api/v1/leave", leaveRoutesV1);
app.use("/api/v1/level", levelRoutesV1);
app.use("/api/v1/analytics", analyticsRoutesV1);
app.use("/api/v1/client", clientRoutesV1);
// app.use("/api/v1/super-admin", superAdminRoutesV1);

app.use(notFound);
app.use(errorMiddleware);

const startServer = async () => {
  try {
    await connectDB(process.env.DB_URI);
    console.log(`DB Connected!`);
    app.listen(port, () => console.log(`Server is listening on PORT:${port}`));
  } catch (error) {
    console.log(`Couldn't connect because of ${error.message}`);
    process.exit(1);
  }
};

startServer();
