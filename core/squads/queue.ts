import { FifoAccountQueue } from "../../proxy-gateway/queue";
import { isKillSwitchEngaged } from "../security/kill-switch";

export const sharedQueue = new FifoAccountQueue({
  minDelayMs: 280,
  maxDelayMs: 720,
  isKilled: isKillSwitchEngaged,
});
