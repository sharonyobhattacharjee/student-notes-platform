
import nodemailer from "nodemailer";
import { config } from "./config.js";

/**
 * Central email service for the Note Sharing Platform.
 *
 * Supported email purposes:
 * - Email verification
 * - Password reset
 * - Password changed notifications
 * - Account security alerts
 * - Account suspension notifications
 * - Administrative notifications
 *
 * Existing API remains compatible:
 *
 * await sendSecurityEmail({
 *   to,
 *   subject,
 *   text
 * });
 */

/**
 * SMTP configuration.
 *
 * SMTP_PASS is supported for backward compatibility.
 * SMTP_PASSWORD is also supported.
 */
const SMTP_HOST = process.env.SMTP_HOST || null;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

const SMTP_SECURE =
  String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

const SMTP_USER = process.env.SMTP_USER || null;

const SMTP_PASSWORD =
  process.env.SMTP_PASS ||
  process.env.SMTP_PASSWORD ||
  null;

const MAIL_FROM =
  process.env.MAIL_FROM ||
  process.env.EMAIL_FROM ||
  SMTP_USER;

const APP_NAME =
  process.env.APP_NAME || "Student Notes Platform";

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || MAIL_FROM;

/**
 * Email service limits.
 */
const MAX_RECIPIENT_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;
const MAX_TEXT_LENGTH = 30000;

/**
 * Determine whether SMTP is configured.
 */
const configured = Boolean(
  SMTP_HOST &&
  SMTP_USER &&
  SMTP_PASSWORD &&
  MAIL_FROM &&
  Number.isInteger(SMTP_PORT) &&
  SMTP_PORT > 0 &&
  SMTP_PORT <= 65535
);

/**
 * Validate an email address.
 *
 * This is basic syntax validation. Actual deliverability is
 * determined by the receiving email provider.
 */
function validateEmailAddress(email) {
  if (
    typeof email !== "string" ||
    email.length === 0 ||
    email.length > MAX_RECIPIENT_LENGTH
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate email content.
 */
function validateEmailContent({ to, subject, text }) {
  if (!validateEmailAddress(to)) {
    throw new TypeError("A valid recipient email address is required.");
  }

  if (
    typeof subject !== "string" ||
    subject.trim().length === 0 ||
    subject.length > MAX_SUBJECT_LENGTH
  ) {
    throw new TypeError("A valid email subject is required.");
  }

  if (
    typeof text !== "string" ||
    text.trim().length === 0 ||
    text.length > MAX_TEXT_LENGTH
  ) {
    throw new TypeError("Valid email text is required.");
  }
}

/**
 * Create the Nodemailer transport.
 *
 * Transport creation is lazy so local development can continue
 * even when SMTP credentials have not been configured.
 */
function createTransporter() {
  if (!configured) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
}

const transporter = createTransporter();

/**
 * Internal email sending implementation.
 */
async function sendEmail({
  to,
  subject,
  text,
  html,
}) {
  validateEmailContent({
    to,
    subject,
    text,
  });

  if (!transporter) {
    console.warn(
      `[email disabled] SMTP is not configured. Subject: ${subject}`
    );

    return false;
  }

  const message = {
    from: MAIL_FROM,
    to,
    subject: subject.trim(),
    text,
  };

  if (typeof html === "string" && html.trim().length > 0) {
    message.html = html;
  }

  try {
    const result = await transporter.sendMail(message);

    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  } catch (error) {
    console.error("Email delivery failed:", error.message);

    throw new Error("Unable to send email. Please try again later.");
  }
}

/**
 * Existing security email function.
 *
 * Backward-compatible with the original application.
 *
 * Returns:
 * - false if SMTP is not configured.
 * - Nodemailer delivery information on success.
 * - Throws a generic error on delivery failure.
 */
export async function sendSecurityEmail({
  to,
  subject,
  text,
}) {
  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send an email verification message.
 */
export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
  expiresInHours = 24,
}) {
  if (
    typeof verificationUrl !== "string" ||
    !verificationUrl.startsWith("https://") &&
    !verificationUrl.startsWith("http://")
  ) {
    throw new TypeError("A valid verification URL is required.");
  }

  const safeName = typeof name === "string" && name.trim()
    ? name.trim()
    : "Student";

  const subject = `${APP_NAME}: Verify your email address`;

  const text = [
    `Hello ${safeName},`,
    "",
    "Thank you for registering with Student Notes Platform.",
    "",
    "Please verify your email address using the link below:",
    verificationUrl,
    "",
    `This verification link expires in ${expiresInHours} hours.`,
    "",
    "If you did not create this account, you can ignore this email.",
    "",
    `Regards,`,
    APP_NAME,
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresInMinutes = 30,
}) {
  if (
    typeof resetUrl !== "string" ||
    !resetUrl.startsWith("https://") &&
    !resetUrl.startsWith("http://")
  ) {
    throw new TypeError("A valid password reset URL is required.");
  }

  const safeName = typeof name === "string" && name.trim()
    ? name.trim()
    : "Student";

  const subject = `${APP_NAME}: Password reset request`;

  const text = [
    `Hello ${safeName},`,
    "",
    "We received a request to reset your account password.",
    "",
    "Use the following link to create a new password:",
    resetUrl,
    "",
    `This link expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request a password reset, ignore this email.",
    "Your current password will remain unchanged.",
    "",
    "For security reasons, never share this link with anyone.",
    "",
    `Regards,`,
    APP_NAME,
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send a password-change notification.
 */
export async function sendPasswordChangedEmail({
  to,
  name,
}) {
  const safeName = typeof name === "string" && name.trim()
    ? name.trim()
    : "Student";

  const subject = `${APP_NAME}: Password changed`;

  const text = [
    `Hello ${safeName},`,
    "",
    "Your account password was successfully changed.",
    "",
    "If you performed this action, no further action is required.",
    "",
    "If you did not change your password:",
    "1. Reset your password immediately.",
    "2. Review your account activity.",
    "3. Contact support if you notice suspicious activity.",
    "",
    `Support: ${SUPPORT_EMAIL || "Contact the platform administrator"}`,
    "",
    APP_NAME,
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send an account suspension notification.
 */
export async function sendAccountSuspendedEmail({
  to,
  name,
  reason,
}) {
  const safeName = typeof name === "string" && name.trim()
    ? name.trim()
    : "Student";

  const safeReason =
    typeof reason === "string" && reason.trim()
      ? reason.trim().slice(0, 1000)
      : "Please contact the platform administrator for details.";

  const subject = `${APP_NAME}: Account status update`;

  const text = [
    `Hello ${safeName},`,
    "",
    "Your Student Notes Platform account has been suspended.",
    "",
    "Reason:",
    safeReason,
    "",
    "If you believe this action was taken in error, contact support.",
    "",
    `Support: ${SUPPORT_EMAIL || "Contact the platform administrator"}`,
    "",
    APP_NAME,
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send an account reactivation notification.
 */
export async function sendAccountReactivatedEmail({
  to,
  name,
}) {
  const safeName = typeof name === "string" && name.trim()
    ? name.trim()
    : "Student";

  const subject = `${APP_NAME}: Account reactivated`;

  const text = [
    `Hello ${safeName},`,
    "",
    "Your Student Notes Platform account has been reactivated.",
    "",
    "You can now sign in and use the platform again.",
    "",
    "If you did not expect this change, contact support.",
    "",
    APP_NAME,
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send a suspicious login notification.
 */
export async function sendLoginSecurityAlert({
  to,
  name,
  ipAddress,
  userAgent,
  loginTime = new Date(),
}) {
  const safeName = typeof name === "string" && name.trim()
    ? name.trim()
    : "Student";

  const safeIp =
    typeof ipAddress === "string"
      ? ipAddress.slice(0, 100)
      : "Unavailable";

  const safeUserAgent =
    typeof userAgent === "string"
      ? userAgent.slice(0, 500)
      : "Unavailable";

  const subject = `${APP_NAME}: Login security alert`;

  const text = [
    `Hello ${safeName},`,
    "",
    "A login to your account was recorded.",
    "",
    `Time: ${new Date(loginTime).toISOString()}`,
    `IP address: ${safeIp}`,
    `Browser information: ${safeUserAgent}`,
    "",
    "If this was you, no action is required.",
    "",
    "If you do not recognize this login, change your password immediately.",
    "",
    APP_NAME,
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text,
  });
}

/**
 * Send an administrative notification.
 */
export async function sendAdminNotification({
  to,
  subject,
  message,
}) {
  if (
    typeof message !== "string" ||
    message.trim().length === 0
  ) {
    throw new TypeError("An administrative notification message is required.");
  }

  return sendEmail({
    to,
    subject: `${APP_NAME}: ${subject}`,
    text: message,
  });
}

/**
 * Send a generic account security notification.
 */
export async function sendAccountSecurityNotification({
  to,
  name,
  title,
  message,
}) {
  const safeName = typeof name === "string" && name.trim()
    ? name.trim()
    : "Student";

  if (
    typeof title !== "string" ||
    title.trim().length === 0
  ) {
    throw new TypeError("A notification title is required.");
  }

  if (
    typeof message !== "string" ||
    message.trim().length === 0
  ) {
    throw new TypeError("A notification message is required.");
  }

  const text = [
    `Hello ${safeName},`,
    "",
    message,
    "",
    "If you do not recognize this activity, contact support.",
    "",
    APP_NAME,
  ].join("\n");

  return sendEmail({
    to,
    subject: `${APP_NAME}: ${title}`,
    text,
  });
}

/**
 * Test the SMTP connection.
 *
 * This should be used by a protected administrator diagnostic
 * endpoint or a deployment test, not on every application request.
 */
export async function verifyEmailTransport() {
  if (!transporter) {
    return {
      configured: false,
      connected: false,
      message: "SMTP is not configured.",
    };
  }

  try {
    await transporter.verify();

    return {
      configured: true,
      connected: true,
      message: "SMTP connection successful.",
    };
  } catch (error) {
    console.error("SMTP verification failed:", error.message);

    return {
      configured: true,
      connected: false,
      message: "SMTP connection failed.",
    };
  }
}

/**
 * Return email service configuration status.
 *
 * SMTP credentials are never returned.
 */
export function getEmailServiceStatus() {
  return {
    configured,
    hostConfigured: Boolean(SMTP_HOST),
    usernameConfigured: Boolean(SMTP_USER),
    passwordConfigured: Boolean(SMTP_PASSWORD),
    senderConfigured: Boolean(MAIL_FROM),
    port: configured ? SMTP_PORT : null,
    secure: configured ? SMTP_SECURE : null,
  };
}

/**
 * Close pooled SMTP connections.
 *
 * Intended for controlled scripts and test shutdown.
 */
export function closeEmailTransport() {
  if (transporter) {
    transporter.close();
  }
}
