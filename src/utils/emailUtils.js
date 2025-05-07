import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import OTP from "../v1/models/otp.model.js";
import generateOTP from "../utils/generateOTP.js";
import createTransporter from "../lib/emailTransporter.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { formatDate } from "./dateUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatesDir = path.join(__dirname, "..", "templates");

const templatePaths = {
  otp: path.join(templatesDir, "OTPTemplate.html"),
  employeeInviteEmail: path.join(templatesDir, "InviteTemplate.html"),
  tenantWelcomeEmail: path.join(templatesDir, "tenantTemplate.html"),
  forgotPasswordEmail: path.join(templatesDir, "ForgotPasswordTemplate.html"),
  leaveRquestEmail: path.join(templatesDir, "LeaveRequest.html"),
  leaveApprovalEmail: path.join(templatesDir, "LeaveApproval.html"),
  leaveRejectionEmail: path.join(templatesDir, "LeaveRejection.html"),
  clientLeaveRequestEmail: path.join(templatesDir, "ClientLeaveRequest.html"),
  clientLeaveRejectionEmail: path.join(
    templatesDir,
    "ClientLeaveRejection.html"
  ),
  relieverRequestEmail: path.join(templatesDir, "RelieverRequest.html"),
  lineMangerFinalApproval: path.join(
    templatesDir,
    "LineManagerLeaveApproval.html"
  ),
};

const templates = Object.fromEntries(
  Object.entries(templatePaths).map(([key, filePath]) => [
    key,
    handlebars.compile(fs.readFileSync(filePath, "utf8")),
  ])
);

const transporter = createTransporter();
const defaultSender = process.env.ADMIN_EMAIL;

async function sendEmail({ from, to, subject, text, html }) {
  try {
    const mailOptions = {
      from: from || defaultSender,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response, info.envelope.to);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

async function sendOTP(email, userName) {
  try {
    await OTP.findOneAndDelete({ email });
    const otp = generateOTP();
    await OTP.create({ email, otp });

    const subject = "OTP Request";
    const date = new Date().toLocaleString();
    const emailText = `Hello ${userName},\n\nYour OTP is: ${otp}`;
    const html = templates.otp({ userName, otp, date });

    return sendEmail({ to: email, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
}

async function sendInvitation({
  email,
  userName,
  tenantName,
  inviteUrl,
  plainPassword,
  logo,
  date = new Date(),
}) {
  try {
    const subject = `Invitation to Join ${tenantName} on HRCore`;

    const emailText = `
      Hello ${userName},\n\n
      You have been invited to join the ${tenantName} On HRCore. Your temporary password is: ${plainPassword}.
      Please click the link below to complete your registration:\n\n
      ${inviteUrl}
    `;

    const html = templates.employeeInviteEmail({
      userName,
      tenantName,
      plainPassword,
      inviteUrl,
      logo,
      date,
    });

    return sendEmail({ to: email, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw error;
  }
}

async function sendWelcomeEmailToTenant({
  tenantId,
  email,
  plainPassword,
  loginUrl,
}) {
  try {
    const subject = "Welcome to HRCore";

    const emailText = `
      A Tenant Account was created for you on HRCore.\n\n
      Your temporary password is: ${plainPassword}.\n\n
      Please log on to your account and change this password.\n\n
      Click the link below to login:\n
      ${loginUrl}
    `;

    const html = templates.tenantWelcomeEmail({
      plainPassword,
      loginUrl,
      tenantId,
      loginUrl,
    });

    return sendEmail({ to: email, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending tenant email:", error);
    throw error;
  }
}

// Leaves
async function sendLeaveRequestEmail({
  tenantName,
  color = "#000000",
  logo,
  lineManagerName,
  lineManagerEmail,
  employeeName,
  startDate,
  resumptionDate,
  leaveReason,
  leaveRequestUrl,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Leave Request";

    const emailText = `
      Hello ${lineManagerName},\n\n
      ${employeeName} has requested leave from ${startDate} to ${resumptionDate} for the following reason:\n\n
      Reason: ${leaveReason}\n\n
      Click the link below to view leave details:\n
      ${leaveRequestUrl}
    `;

    const html = templates.leaveRquestEmail({
      tenantName,
      color,
      logo,
      lineManagerName,
      employeeName,
      startDate: formatDate(startDate),
      resumptionDate: formatDate(resumptionDate),
      leaveReason,
      leaveRequestUrl,
      date,
    });

    return sendEmail({ to: lineManagerEmail, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending tenant email:", error);
    throw error;
  }
}
async function sendLeaveRequestEmailToReliever({
  tenantName,
  color = "#000000",
  logo,
  lineManagerName,
  employeeName,
  relieverName,
  relieverEmail,
  startDate,
  resumptionDate,
  leaveReason,
  leaveRequestUrl,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Leave Request";

    const emailText = `
      Hello ${relieverName},\n\n
      ${employeeName} who is relieving his duties to you has requested to go on leave from ${startDate} to ${resumptionDate} for the following reason:\n\n
      Reason: ${leaveReason}\n\n
    `;

    const html = templates.relieverRequestEmail({
      tenantName,
      color,
      logo,
      lineManagerName,
      employeeName,
      relieverName,
      relieverEmail,
      startDate: formatDate(startDate),
      resumptionDate: formatDate(resumptionDate),
      leaveReason,
      leaveRequestUrl,
      date,
    });

    console.log(`Reliever Email: ${relieverEmail}`);

    return sendEmail({ to: relieverEmail, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending tenant email:", error);
    throw error;
  }
}

async function sendLeaveApprovalEmail({
  email,
  tenantName,
  color = "#000000",
  logo,
  lineManagerName,
  employeeName,
  employeeEmail,
  startDate,
  resumptionDate,
  leaveReason,
  leaveRequestUrl,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Leave Request Approved";

    const emailText = `
      Hello ${lineManagerName},\n\n
      your leave request from ${startDate} to ${resumptionDate} has been been approved:\n\n
      Click the link below to view leave details:\n
      ${leaveRequestUrl}
    `;

    const html = templates.leaveApprovalEmail({
      tenantName,
      color,
      logo,
      lineManagerName,
      employeeName,
      startDate: formatDate(startDate),
      resumptionDate: formatDate(resumptionDate),
      leaveReason,
      leaveRequestUrl,
      date,
    });

    return sendEmail({ to: employeeEmail, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending tenant email:", error);
    throw error;
  }
}
async function sendLeaveApprovalEmailToLineManager({
  email,
  tenantName,
  color = "#000000",
  logo,
  lineManagerName,
  lineManagerEmail,
  employeeName,
  employeeEmail,
  startDate,
  resumptionDate,
  leaveReason,
  leaveRequestUrl,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Leave Request Approved";

    const emailText = `
      Hello ${lineManagerName},\n\n
      ${employeeName} who requested to go on leave from ${startDate} to ${resumptionDate} has gotten their second and final approval:\n\n
      Click the link below to view leave details:\n
      ${leaveRequestUrl}
    `;

    const html = templates.lineMangerFinalApproval({
      tenantName,
      color,
      logo,
      lineManagerName,
      employeeName,
      startDate: formatDate(startDate),
      resumptionDate: formatDate(resumptionDate),
      leaveReason,
      leaveRequestUrl,
      date,
    });

    return sendEmail({ to: lineManagerEmail, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending tenant email:", error);
    throw error;
  }
}

async function sendLeaveRejectionEmail({
  email,
  tenantName,
  color = "#000000",
  logo,
  lineManagerName,
  employeeName,
  employeeEmail,
  startDate,
  resumptionDate,
  leaveReason,
  rejectionReason,
  leaveRequestUrl,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Leave Request";

    const emailText = `
    Hello ${lineManagerName},\n\n
    we regret to inform you that your leave request from ${startDate} to ${resumptionDate} has been been rejected:\n\n
    Click the link below to view leave details:\n
    ${leaveRequestUrl}
  `;

    const html = templates.leaveRejectionEmail({
      tenantName,
      color,
      logo,
      lineManagerName,
      employeeName,
      startDate: formatDate(startDate),
      resumptionDate: formatDate(resumptionDate),
      leaveReason,
      rejectionReason,
      leaveRequestUrl,
      date,
    });

    return sendEmail({ to: employeeEmail, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending tenant email:", error);
    throw error;
  }
}

//Client

async function sendClientLeaveRequestEmail({
  email,
  tenantName,
  tenantEmail,
  color = "#000000",
  logo,
  lineManagerName,
  employeeName,
  startDate,
  resumptionDate,
  leaveReason,
  leaveRequestUrl,
  clientLeaveRequestUrl,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Leave Request";

    const emailText = `
      Hello there,\n\n
      ${employeeName} has requested leave from ${startDate} to ${resumptionDate} for the following reason:\n\n
      Reason: ${leaveReason}\n\n
      Click the link below to view leave details:\n
      ${leaveRequestUrl}
    `;

    const html = templates.clientLeaveRequestEmail({
      tenantName,
      color,
      logo,
      lineManagerName,
      employeeName,
      startDate: formatDate(startDate),
      resumptionDate: formatDate(resumptionDate),
      leaveReason,
      leaveRequestUrl,
      clientLeaveRequestUrl,
      date,
    });

    return sendEmail({ to: tenantEmail, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending client leave request email:", error);
    throw error;
  }
}

async function sendClientLeaveRejectionEmail({
  email,
  tenantName,
  color = "#000000",
  logo,
  lineManagerName,
  employeeName,
  employeeEmail,
  startDate,
  resumptionDate,
  leaveReason,
  rejectionReason,
  leaveRequestUrl,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Leave Request";

    const emailText = `
    Hello ${lineManagerName},\n\n
    we regret to inform you that your leave request from ${startDate} to ${resumptionDate} has been been rejected:\n\n
    Click the link below to view leave details:\n
    ${leaveRequestUrl}
  `;

    const html = templates.clientLeaveRejectionEmail({
      tenantName,
      color,
      logo,
      lineManagerName,
      employeeName,
      startDate: formatDate(startDate),
      resumptionDate: formatDate(resumptionDate),
      leaveReason,
      rejectionReason,
      leaveRequestUrl,
      date,
    });

    return sendEmail({ to: employeeEmail, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending tenant email:", error);
    throw error;
  }
}

async function sendForgotPasswordEmail({
  email,
  resetUrl,
  name,
  color = "#000000",
  tenantName,
  logo,
  date = new Date().getFullYear(),
}) {
  try {
    const subject = "Reset Your Password";

    const emailText = `
      Hello ${name},\n\n
      You recently requested to reset your password. Please click the link below to proceed:\n
      ${resetUrl}\n\n
      If you did not request this action, you can safely ignore this email.
    `;

    const html = templates.forgotPasswordEmail({
      resetUrl,
      name,
      color,
      tenantName,
      logo,
      date,
    });

    return sendEmail({ to: email, subject, text: emailText, html });
  } catch (error) {
    console.error("Error sending forgot password email:", error);
    throw error;
  }
}

// Export functions
export default {
  sendEmail,
  sendOTP,
  sendInvitation,
  sendWelcomeEmailToTenant,
  sendForgotPasswordEmail,
  sendLeaveRequestEmail,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
  sendClientLeaveRequestEmail,
  sendClientLeaveRejectionEmail,
  sendLeaveRequestEmailToReliever,
  sendLeaveApprovalEmailToLineManager,
};
