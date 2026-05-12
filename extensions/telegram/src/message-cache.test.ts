import type { Message } from "@grammyjs/types";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildTelegramConversationContext,
  buildTelegramReplyChain,
  createTelegramMessageCache,
  resetTelegramMessageCacheForTests,
  resolveTelegramMessageCacheScopeKey,
} from "./message-cache.js";

describe("telegram message cache", () => {
  afterEach(() => {
    resetTelegramMessageCacheForTests();
  });

  it("hydrates reply chains from persisted cached messages", () => {
    const persistedScopeKey = resolveTelegramMessageCacheScopeKey(
      `message-cache-test:${process.pid}:${Date.now()}`,
    );
    const firstCache = createTelegramMessageCache({ persistedScopeKey });
    firstCache.record({
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "private", first_name: "Kesava" },
        message_id: 9000,
        date: 1736380700,
        from: { id: 1, is_bot: false, first_name: "Kesava" },
        photo: [{ file_id: "photo-1", file_unique_id: "photo-unique-1", width: 640, height: 480 }],
      } as Message,
    });
    firstCache.record({
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "private", first_name: "Ada" },
        message_id: 9001,
        date: 1736380750,
        text: "The cache warmer is the piece I meant",
        from: { id: 2, is_bot: false, first_name: "Ada" },
        reply_to_message: {
          chat: { id: 7, type: "private", first_name: "Kesava" },
          message_id: 9000,
          date: 1736380700,
          from: { id: 1, is_bot: false, first_name: "Kesava" },
          photo: [
            { file_id: "photo-1", file_unique_id: "photo-unique-1", width: 640, height: 480 },
          ],
        } as Message["reply_to_message"],
      } as Message,
    });

    const secondCache = createTelegramMessageCache({ persistedScopeKey });
    const chain = buildTelegramReplyChain({
      cache: secondCache,
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "private", first_name: "Grace" },
        message_id: 9002,
        text: "Please explain what this reply was about",
        from: { id: 3, is_bot: false, first_name: "Grace" },
        reply_to_message: {
          chat: { id: 7, type: "private", first_name: "Ada" },
          message_id: 9001,
          date: 1736380750,
          text: "The cache warmer is the piece I meant",
          from: { id: 2, is_bot: false, first_name: "Ada" },
        } as Message["reply_to_message"],
      } as Message,
    });

    expect(chain).toEqual([
      {
        messageId: "9001",
        sender: "Ada",
        senderId: "2",
        timestamp: 1736380750000,
        body: "The cache warmer is the piece I meant",
        replyToId: "9000",
        sourceMessage: {
          chat: { id: 7, type: "private", first_name: "Ada" },
          message_id: 9001,
          date: 1736380750,
          text: "The cache warmer is the piece I meant",
          from: { id: 2, is_bot: false, first_name: "Ada" },
          reply_to_message: {
            chat: { id: 7, type: "private", first_name: "Kesava" },
            message_id: 9000,
            date: 1736380700,
            from: { id: 1, is_bot: false, first_name: "Kesava" },
            photo: [
              { file_id: "photo-1", file_unique_id: "photo-unique-1", width: 640, height: 480 },
            ],
          },
        },
      },
      {
        messageId: "9000",
        sender: "Kesava",
        senderId: "1",
        timestamp: 1736380700000,
        mediaRef: "telegram:file/photo-1",
        mediaType: "image",
        body: "<media:image>",
        sourceMessage: {
          chat: { id: 7, type: "private", first_name: "Kesava" },
          message_id: 9000,
          date: 1736380700,
          from: { id: 1, is_bot: false, first_name: "Kesava" },
          photo: [
            { file_id: "photo-1", file_unique_id: "photo-unique-1", width: 640, height: 480 },
          ],
        },
      },
    ]);
  });

  it("shares one persisted bucket across live cache instances", () => {
    const persistedScopeKey = resolveTelegramMessageCacheScopeKey(
      `message-cache-shared-test:${process.pid}:${Date.now()}`,
    );
    const firstCache = createTelegramMessageCache({ persistedScopeKey });
    const secondCache = createTelegramMessageCache({ persistedScopeKey });
    firstCache.record({
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "private", first_name: "Nora" },
        message_id: 9100,
        date: 1736380700,
        text: "Architecture sketch for the cache warmer",
        from: { id: 1, is_bot: false, first_name: "Nora" },
      } as Message,
    });
    secondCache.record({
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "private", first_name: "Ira" },
        message_id: 9101,
        date: 1736380750,
        text: "The cache warmer is the piece I meant",
        from: { id: 2, is_bot: false, first_name: "Ira" },
        reply_to_message: {
          chat: { id: 7, type: "private", first_name: "Nora" },
          message_id: 9100,
          date: 1736380700,
          text: "Architecture sketch for the cache warmer",
          from: { id: 1, is_bot: false, first_name: "Nora" },
        } as Message["reply_to_message"],
      } as Message,
    });

    const reloadedCache = createTelegramMessageCache({ persistedScopeKey });
    const chain = buildTelegramReplyChain({
      cache: reloadedCache,
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "private", first_name: "Mina" },
        message_id: 9102,
        text: "Please explain what this reply was about",
        from: { id: 3, is_bot: false, first_name: "Mina" },
        reply_to_message: {
          chat: { id: 7, type: "private", first_name: "Ira" },
          message_id: 9101,
          date: 1736380750,
          text: "The cache warmer is the piece I meant",
          from: { id: 2, is_bot: false, first_name: "Ira" },
        } as Message["reply_to_message"],
      } as Message,
    });

    expect(chain.map((entry) => entry.messageId)).toEqual(["9101", "9100"]);
  });

  it("returns recent chat messages before the current message", () => {
    const cache = createTelegramMessageCache();
    for (const id of [41, 42, 43, 44]) {
      cache.record({
        accountId: "default",
        chatId: 7,
        threadId: 100,
        msg: {
          chat: { id: 7, type: "supergroup", title: "Ops" },
          message_thread_id: 100,
          message_id: id,
          date: 1736380700 + id,
          text: `live message ${id}`,
          from: { id, is_bot: false, first_name: `User ${id}` },
        } as Message,
      });
    }
    cache.record({
      accountId: "default",
      chatId: 7,
      threadId: 200,
      msg: {
        chat: { id: 7, type: "supergroup", title: "Ops" },
        message_thread_id: 200,
        message_id: 142,
        date: 1736380743,
        text: "different topic",
        from: { id: 99, is_bot: false, first_name: "Other" },
      } as Message,
    });

    expect(
      cache
        .recentBefore({
          accountId: "default",
          chatId: 7,
          threadId: 100,
          messageId: "44",
          limit: 2,
        })
        .map((entry) => entry.messageId),
    ).toEqual(["42", "43"]);
  });

  it("returns nearby messages around a stale reply target", () => {
    const cache = createTelegramMessageCache();
    for (const id of [100, 101, 102, 200, 201]) {
      cache.record({
        accountId: "default",
        chatId: 7,
        msg: {
          chat: { id: 7, type: "group", title: "Ops" },
          message_id: id,
          date: 1736380700 + id,
          text: `message ${id}`,
          from: { id, is_bot: false, first_name: `User ${id}` },
        } as Message,
      });
    }

    expect(
      cache
        .around({
          accountId: "default",
          chatId: 7,
          messageId: "101",
          before: 1,
          after: 1,
        })
        .map((entry) => entry.messageId),
    ).toEqual(["100", "101", "102"]);
  });

  it("selects reply targets referenced by the current local window", () => {
    const cache = createTelegramMessageCache();
    for (const id of [33867, 33868, 33869]) {
      cache.record({
        accountId: "default",
        chatId: 7,
        msg: {
          chat: { id: 7, type: "group", title: "Ops" },
          message_id: id,
          date: 1736380000 + id,
          text: `old context ${id}`,
          from: { id, is_bot: false, first_name: `Old ${id}` },
        } as Message,
      });
    }
    for (let id = 34460; id <= 34475; id++) {
      cache.record({
        accountId: "default",
        chatId: 7,
        msg: {
          chat: { id: 7, type: "group", title: "Ops" },
          message_id: id,
          date: 1736380000 + id,
          text: `recent context ${id}`,
          from: { id, is_bot: false, first_name: `Recent ${id}` },
        } as Message,
      });
    }
    cache.record({
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "group", title: "Ops" },
        message_id: 34476,
        date: 1736380000 + 34476,
        text: "@HamVerBot what about now",
        from: { id: 34476, is_bot: false, first_name: "Ayaan" },
        reply_to_message: {
          chat: { id: 7, type: "group", title: "Ops" },
          message_id: 33868,
          date: 1736380000 + 33868,
          text: "old context 33868",
          from: { id: 33868, is_bot: false, first_name: "Old 33868" },
        } as Message["reply_to_message"],
      } as Message,
    });
    cache.record({
      accountId: "default",
      chatId: 7,
      msg: {
        chat: { id: 7, type: "group", title: "Ops" },
        message_id: 34477,
        date: 1736380000 + 34477,
        text: "Show me raw input",
        from: { id: 34477, is_bot: false, first_name: "Ayaan" },
      } as Message,
    });

    const context = buildTelegramConversationContext({
      cache,
      accountId: "default",
      chatId: 7,
      messageId: "34477",
      replyChainNodes: [],
      recentLimit: 10,
      replyTargetWindowSize: 1,
    });

    expect(context.map((entry) => entry.node.messageId)).toEqual([
      "33867",
      "33868",
      "33869",
      "34467",
      "34468",
      "34469",
      "34470",
      "34471",
      "34472",
      "34473",
      "34474",
      "34475",
      "34476",
    ]);
    expect(context.find((entry) => entry.node.messageId === "33868")?.isReplyTarget).toBe(true);
    expect(context.find((entry) => entry.node.messageId === "34477")).toBeUndefined();
  });
});
