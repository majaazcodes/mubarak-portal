import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

export function registerRequestId(instance: {
  addHook: (
    name: "onRequest",
    handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
  ) => void;
}): void {
  instance.addHook("onRequest", async (req, reply) => {
    const incoming = req.headers["x-request-id"];
    const id =
      typeof incoming === "string" && incoming.length > 0
        ? incoming
        : randomUUID();
    (req as FastifyRequest & { id: string }).id = id;
    void reply.header("x-request-id", id);
  });
}
