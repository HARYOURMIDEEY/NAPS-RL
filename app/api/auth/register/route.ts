import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`register:${getClientIp(req)}`, 5, 60 * 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Server-side uniqueness — never trust only a frontend check.
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: data.username },
        { studentEmail: data.studentEmail },
        { personalEmail: data.personalEmail },
        { matricNumber: data.matricNumber },
      ],
    },
    select: { username: true, studentEmail: true, personalEmail: true, matricNumber: true },
  });

  if (existing) {
    let field = "account details";
    if (existing.username === data.username) field = "username";
    else if (existing.studentEmail === data.studentEmail) field = "student email";
    else if (existing.personalEmail === data.personalEmail) field = "personal email";
    else if (existing.matricNumber === data.matricNumber) field = "matriculation number";
    return NextResponse.json({ error: `That ${field} is already registered.` }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        username: data.username,
        studentEmail: data.studentEmail,
        personalEmail: data.personalEmail,
        matricNumber: data.matricNumber,
        phoneNumber: data.phoneNumber,
        level: data.level,
        passwordHash,
        role: "STUDENT",
        isEmailVerified: true,
      },
    });
  } catch (err) {
    // Two people registering the same details at the same moment.
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Those account details are already registered." }, { status: 409 });
    }
    throw err;
  }

  // Email verification is disabled: newly registered accounts are immediately usable.
  return NextResponse.json({ userId: user.id, emailSent: true }, { status: 201 });
}
