import { z } from "zod";

const buzzSlotSchema = z.object({
  dongleId: z.number().int().min(0).max(31),
  controllerIndex: z.number().int().min(0).max(3),
});

const emptyPayload = z.object({}).optional();

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PING"), payload: emptyPayload }),
  z.object({
    type: z.literal("CREATE_ROOM"),
    payload: z.object({ hostName: z.string().min(1).max(12) }),
  }),
  z.object({
    type: z.literal("JOIN_ROOM"),
    payload: z.object({
      roomCode: z.string().regex(/^[A-Z0-9]{4}$/),
      playerName: z.string().min(1).max(12),
      deviceType: z.enum(["phone", "buzz"]),
      buzzSlot: buzzSlotSchema.optional(),
    }),
  }),
  z.object({
    type: z.literal("RECONNECT"),
    payload: z.object({
      roomCode: z.string().regex(/^[A-Z0-9]{4}$/),
      playerId: z.string().min(1).max(64),
    }),
  }),
  z.object({
    type: z.literal("START_GAME"),
    payload: z.object({ packId: z.string().min(1).max(80) }),
  }),
  z.object({ type: z.literal("BUZZ"), payload: z.object({ buzzPlayerId: z.string().min(1).max(64).optional() }).optional() }),
  z.object({
    type: z.literal("ANSWER"),
    payload: z.object({
      choice: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      buzzPlayerId: z.string().min(1).max(64).optional(),
    }),
  }),
  z.object({
    type: z.literal("WAGER"),
    payload: z.object({ amount: z.number().int().min(0), buzzPlayerId: z.string().min(1).max(64).optional() }),
  }),
  z.object({ type: z.literal("NEXT_QUESTION"), payload: emptyPayload }),
  z.object({ type: z.literal("RESET_GAME"), payload: emptyPayload }),
  z.object({ type: z.literal("TOGGLE_PAUSE"), payload: emptyPayload }),
  z.object({
    type: z.literal("LEAVE"),
    payload: z.object({ buzzPlayerId: z.string().min(1).max(64) }).optional(),
  }),
]);

export type ValidatedClientMessage = z.infer<typeof clientMessageSchema>;

export function parseClientMessage(input: unknown): ValidatedClientMessage | null {
  const result = clientMessageSchema.safeParse(input);
  return result.success ? result.data : null;
}
