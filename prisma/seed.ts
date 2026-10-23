import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// §17 SUPER ADMIN bootstrap: the password is read from an environment
// variable at seed time only — never hardcoded, never committed, never
// logged. Run this once against a fresh database, then remove
// INITIAL_SUPER_ADMIN_PASSWORD from your environment.
async function main() {
  const initialPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD;
  if (!initialPassword || initialPassword.length < 12) {
    throw new Error(
      "Set INITIAL_SUPER_ADMIN_PASSWORD (12+ characters) in your environment before seeding."
    );
  }

  const adminUsername = process.env.SUPER_ADMIN_USERNAME?.trim() || "Haryourmidey";
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim() || "Haryourmidey515@gmail.com";
  const adminName = process.env.SUPER_ADMIN_NAME?.trim() || "Ridwanullahi Muhammed Awwal";

  const superAdmin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      fullName: adminName,
      username: adminUsername,
      personalEmail: adminEmail,
      passwordHash: await bcrypt.hash(initialPassword, 12),
      role: "SUPER_ADMIN",
      isEmailVerified: true,
      mustChangePassword: true, // forced on first login, per §17
    },
  });
  console.log(`Super Admin ready: ${superAdmin.username}`);

  const courseDefs = [
    { code: "PHY301", title: "Classical Mechanics", level: 300 },
    { code: "PHY303", title: "Electromagnetism I", level: 300 },
    { code: "PHY305", title: "Mathematical Methods III", level: 300 },
    { code: "PHY307", title: "Thermodynamics & Statistical Physics", level: 300 },
  ];
  const courses: Record<string, { id: string }> = {};
  for (const c of courseDefs) {
    courses[c.code] = await prisma.course.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log(`Seeded ${courseDefs.length} courses.`);

  if (process.env.SEED_SAMPLE_DATA !== "true") {
    console.log(
      "Skipping demo questions/quiz/exam/announcement (set SEED_SAMPLE_DATA=true to include them)."
    );
    return;
  }

  // --- Sample questions, a practice quiz, and a timed exam for PHY301/303 ---
  type QDef = {
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    course: string;
  };
  const questionDefs: QDef[] = [
    {
      course: "PHY301",
      text: "A particle moves under a central force. Which quantity is conserved about the force centre?",
      options: ["Linear momentum", "Angular momentum", "Kinetic energy alone", "Force vector direction"],
      correctIndex: 1,
      explanation: "Central forces produce zero torque about the centre, so angular momentum is conserved.",
    },
    {
      course: "PHY301",
      text: "In the Lagrangian formalism, L is defined as:",
      options: ["T + V", "T \u2212 V", "V \u2212 T", "dT/dt"],
      correctIndex: 1,
      explanation: "The Lagrangian is kinetic energy minus potential energy, L = T \u2212 V.",
    },
    {
      course: "PHY303",
      text: "Gauss's law relates electric flux through a closed surface to:",
      options: ["The surface area only", "The enclosed charge", "The electric field at the centre", "The magnetic flux"],
      correctIndex: 1,
      explanation: "Gauss's law states the net electric flux through a closed surface equals the enclosed charge divided by \u03b5\u2080.",
    },
    {
      course: "PHY303",
      text: "The SI unit of electric field strength is:",
      options: ["Coulomb", "Volt per metre", "Tesla", "Farad"],
      correctIndex: 1,
      explanation: "Electric field strength is measured in volts per metre (V/m), equivalently N/C.",
    },
  ];

  const createdQuestions: { id: string }[] = [];
  for (const q of questionDefs) {
    const existing = await prisma.question.findFirst({ where: { text: q.text } });
    if (existing) {
      createdQuestions.push(existing);
      continue;
    }
    const question = await prisma.question.create({
      data: {
        text: q.text,
        courseId: courses[q.course].id,
        level: 300,
        difficulty: "MEDIUM",
        explanation: q.explanation,
        createdById: superAdmin.id,
        options: { create: q.options.map((text) => ({ text })) },
      },
      include: { options: true },
    });
    await prisma.question.update({
      where: { id: question.id },
      data: { correctOptionId: question.options[q.correctIndex].id },
    });
    createdQuestions.push(question);
  }
  console.log(`Seeded ${createdQuestions.length} questions.`);

  const mechanicsQuestions = createdQuestions.filter((_, i) => questionDefs[i].course === "PHY301");
  const emagQuestions = createdQuestions.filter((_, i) => questionDefs[i].course === "PHY303");

  const existingQuiz = await prisma.quiz.findFirst({ where: { title: "Classical Mechanics — Practice Quiz" } });
  if (!existingQuiz && mechanicsQuestions.length > 0) {
    await prisma.quiz.create({
      data: {
        title: "Classical Mechanics — Practice Quiz",
        courseId: courses["PHY301"].id,
        level: 300,
        difficulty: "MEDIUM",
        questions: {
          create: mechanicsQuestions.map((q, i) => ({ questionId: q.id, order: i })),
        },
      },
    });
    console.log("Seeded a practice quiz.");
  }

  const existingExam = await prisma.exam.findFirst({ where: { title: "PHY303 — Electromagnetism I: CA Examination" } });
  if (!existingExam && emagQuestions.length > 0) {
    const now = new Date();
    await prisma.exam.create({
      data: {
        title: "PHY303 — Electromagnetism I: CA Examination",
        courseId: courses["PHY303"].id,
        level: 300,
        durationMinutes: 20,
        startAt: now,
        endAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // open for 2 weeks
        attemptLimit: 1,
        passMark: 50,
        revealAnswers: true,
        questions: {
          create: emagQuestions.map((q, i) => ({ questionId: q.id, order: i })),
        },
      },
    });
    console.log("Seeded a timed examination.");
  }

  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { title: "PHY303 CA Examination is now open" },
  });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        title: "PHY303 CA Examination is now open",
        content:
          "The continuous assessment examination for Electromagnetism I is open for the next two weeks. Check the Examinations page for duration and pass mark.",
        priority: "HIGH",
        targetLevel: 300,
      },
    });
    console.log("Seeded an announcement.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
