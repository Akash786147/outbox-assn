import { redis } from "../lib/redis";

const HOUR_MS = 60 * 60 * 1000;
const KEY_TTL_SECONDS = 2 * 60 * 60;

export const currentWindow = (now = Date.now()) => Math.floor(now / HOUR_MS);
const windowStart = (window: number) => window * HOUR_MS;

// INCR + EXPIRE in one atomic step, rolls back if the limit is already used up
const TAKE_SLOT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[2]) end
if count > tonumber(ARGV[1]) then
  redis.call("DECR", KEYS[1])
  return 0
end
return 1
`;

async function takeSlot(key: string, limit: number) {
  const ok = await redis.eval(TAKE_SLOT_SCRIPT, 1, key, limit, KEY_TTL_SECONDS);
  return ok === 1;
}

interface SlotRequest {
  senderId: number;
  batchId: string;
  senderLimit: number;
  batchLimit: number;
}

export type SlotResult = { allowed: true } | { allowed: false; reason: "sender" | "batch" };

export async function reserveSendSlot({ senderId, batchId, senderLimit, batchLimit }: SlotRequest): Promise<SlotResult> {
  const window = currentWindow();
  const batchKey = `rate:batch:${batchId}:${window}`;
  const senderKey = `rate:sender:${senderId}:${window}`;

  if (!(await takeSlot(batchKey, batchLimit))) return { allowed: false, reason: "batch" };

  if (!(await takeSlot(senderKey, senderLimit))) {
    await redis.decr(batchKey);
    return { allowed: false, reason: "sender" };
  }

  return { allowed: true };
}

// moves the email into the next hour window but keeps its offset inside the hour,
// so emails that were spaced out keep the same order after being pushed
export function nextAvailableTime(originalTime: Date) {
  const window = currentWindow();
  const offset = Math.max(0, originalTime.getTime() - windowStart(window));
  return new Date(windowStart(window + 1) + Math.min(offset, HOUR_MS - 1));
}

// true only for the first caller in the current window, so Slack is not spammed
export async function shouldNotify(key: string) {
  const res = await redis.set(`notified:${key}:${currentWindow()}`, "1", "EX", KEY_TTL_SECONDS, "NX");
  return res === "OK";
}
