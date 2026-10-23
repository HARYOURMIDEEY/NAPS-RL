import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  resource: string;
  status: "SUCCESS" | "FAILURE";
  metadata?: Prisma.InputJsonObject;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        resource: params.resource,
        status: params.status,
        metadata: params.metadata,
      },
    });
  } catch (err) {
    // Never let audit logging failures break the request it's logging.
    console.error("Failed to write audit log:", err);
  }
}
