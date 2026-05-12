import { resolveAgentIdFromSessionKey } from "../../routing/session-key.js";
import type { OpenClawConfig } from "../types.openclaw.js";
import { readSqliteSessionDeliveryContext } from "./session-entries.sqlite.js";
import { parseSessionThreadInfo } from "./thread-info.js";

export { parseSessionThreadInfo };

type DeliveryContextInfo = {
  channel?: string;
  to?: string;
  accountId?: string;
  threadId?: string;
};

function hasRoutableDeliveryContext(
  context: DeliveryContextInfo | undefined,
): context is DeliveryContextInfo & { channel: string; to: string } {
  return Boolean(context?.channel && context?.to);
}

export function extractDeliveryInfo(
  sessionKey: string | undefined,
  options?: { cfg?: OpenClawConfig },
): {
  deliveryContext: DeliveryContextInfo | undefined;
  threadId: string | undefined;
} {
  void options;
  const { baseSessionKey, threadId } = parseSessionThreadInfo(sessionKey);
  if (!sessionKey || !baseSessionKey) {
    return { deliveryContext: undefined, threadId };
  }

  let deliveryContext: DeliveryContextInfo | undefined;
  try {
    const agentId = resolveAgentIdFromSessionKey(sessionKey);
    const direct = readSqliteSessionDeliveryContext({ agentId, sessionKey });
    const base =
      !hasRoutableDeliveryContext(direct) && baseSessionKey !== sessionKey
        ? readSqliteSessionDeliveryContext({ agentId, sessionKey: baseSessionKey })
        : undefined;
    const stored = hasRoutableDeliveryContext(direct) ? direct : base;
    if (hasRoutableDeliveryContext(stored)) {
      deliveryContext = {
        channel: stored.channel,
        to: stored.to,
        accountId: stored.accountId,
        threadId: stored.threadId,
      };
    }
  } catch {
    // ignore: best-effort
  }

  return {
    deliveryContext,
    threadId: deliveryContext?.threadId ?? threadId,
  };
}
