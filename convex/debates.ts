import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

// --- Public mutations (called from client) ---

export const startDebate = mutation({
  args: { text: v.string() },
  returns: v.id("debates"),
  handler: async (ctx, { text }) => {
    const debateId = await ctx.db.insert("debates", {
      text,
      phase: "convening",
    });
    await ctx.scheduler.runAfter(0, internal.runDebate.run, { debateId });
    return debateId;
  },
});

// --- Public queries (subscribed from client) ---

export const getDebate = query({
  args: { debateId: v.id("debates") },
  handler: async (ctx, { debateId }) => {
    return await ctx.db.get(debateId);
  },
});

export const getMessages = query({
  args: { debateId: v.id("debates") },
  handler: async (ctx, { debateId }) => {
    return await ctx.db
      .query("debate_messages")
      .withIndex("by_debate", (q) => q.eq("debateId", debateId))
      .collect();
  },
});

// --- Internal mutations (called from actions) ---

export const setPhase = internalMutation({
  args: { debateId: v.id("debates"), phase: v.string() },
  handler: async (ctx, { debateId, phase }) => {
    await ctx.db.patch(debateId, { phase });
  },
});

export const setActiveAgent = internalMutation({
  args: {
    debateId: v.id("debates"),
    activeAgent: v.optional(v.string()),
  },
  handler: async (ctx, { debateId, activeAgent }) => {
    await ctx.db.patch(debateId, { activeAgent, streamingText: undefined });
  },
});

export const setStreamingText = internalMutation({
  args: {
    debateId: v.id("debates"),
    streamingText: v.optional(v.string()),
  },
  handler: async (ctx, { debateId, streamingText }) => {
    await ctx.db.patch(debateId, { streamingText });
  },
});

export const setSubClaims = internalMutation({
  args: {
    debateId: v.id("debates"),
    subClaims: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        category: v.string(),
      }),
    ),
  },
  handler: async (ctx, { debateId, subClaims }) => {
    await ctx.db.patch(debateId, { subClaims });
  },
});

export const setVerdict = internalMutation({
  args: {
    debateId: v.id("debates"),
    verdict: v.object({
      overallRating: v.string(),
      confidence: v.number(),
      summary: v.string(),
      subClaimResults: v.array(
        v.object({
          subClaimId: v.string(),
          rating: v.string(),
          reasoning: v.string(),
        }),
      ),
      recommendedRevision: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { debateId, verdict }) => {
    await ctx.db.patch(debateId, { verdict });
  },
});

export const addMessage = internalMutation({
  args: {
    debateId: v.id("debates"),
    agent: v.string(),
    type: v.string(),
    content: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("debate_messages", args);
    await ctx.db.patch(args.debateId, {
      activeAgent: undefined,
      streamingText: undefined,
    });
  },
});

export const getDebateInternal = internalQuery({
  args: { debateId: v.id("debates") },
  handler: async (ctx, { debateId }) => {
    return await ctx.db.get(debateId);
  },
});
