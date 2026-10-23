import { z } from "zod";

// NOTE: the exact FUTMinna student-email domain and matric-number format have
// not been confirmed by the platform owner. The patterns below are
// deliberately lenient (they accept the common "YYYY/1/12345PP" style as well
// as "YYYY/12345PP") — tighten them once you have the official format.
const STUDENT_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@st\.futminna\.edu\.ng$/;
const MATRIC_PATTERN = /^[0-9]{4}\/([0-9]{1,2}\/)?[0-9]{3,7}[A-Z]{1,4}$/;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .refine((p) => /[0-9]/.test(p) && /[a-zA-Z]/.test(p), {
    message: "Password must contain both letters and numbers.",
  });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter your full name.").max(120),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(32)
      .regex(/^[a-zA-Z0-9_.]+$/, "Only letters, numbers, dots and underscores."),
    studentEmail: z
      .string()
      .trim()
      .toLowerCase()
      .regex(STUDENT_EMAIL_PATTERN, "Enter a valid FUTMinna student email."),
    personalEmail: z.string().trim().toLowerCase().email("Enter a valid email."),
    matricNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(MATRIC_PATTERN, "Enter a valid matriculation number."),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]{10,20}$/, "Enter a valid phone number."),
    level: z.union([
      z.literal(100),
      z.literal(200),
      z.literal(300),
      z.literal(400),
      z.literal(500),
    ]),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const verifySchema = z.object({
  userId: z.string().min(1),
  code: z.string().length(6).regex(/^[0-9]{6}$/, "Enter the 6-digit code."),
});

export const resendSchema = z.object({
  userId: z.string().min(1),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean().optional().default(false),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Your new password must be different from the current one.",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

export const MATERIAL_TYPES = [
  "LECTURE_NOTE",
  "PAST_QUESTION",
  "ASSIGNMENT",
  "SOLUTION",
  "STUDY_GUIDE",
  "REFERENCE",
  "OTHER",
] as const;

export const materialCreateSchema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(200),
  courseCode: z.string().trim().min(1),
  materialType: z.enum(MATERIAL_TYPES),
  level: z.union([
    z.literal(100),
    z.literal(200),
    z.literal(300),
    z.literal(400),
    z.literal(500),
  ]),
  fileUrl: z.string().url(),
  fileName: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
});

export const aiQuestionSchema = z.object({
  question: z.string().trim().min(1, "Ask a question first.").max(2000, "Please keep your question under 2,000 characters."),
  conversationId: z.string().min(1).optional(),
});
