import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  debates: defineTable({
    text: v.string(),
    phase: v.string(),
    activeAgent: v.optional(v.string()),
    streamingText: v.optional(v.string()),
    finalOutput: v.optional(v.string()),
    // Legacy fields kept optional for backwards compatibility with old data
    subClaims: v.optional(
      v.array(
        v.object({
          id: v.string(),
          text: v.string(),
          category: v.string(),
        }),
      ),
    ),
    verdict: v.optional(
      v.object({
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
    ),
  }),

  debate_messages: defineTable({
    debateId: v.id("debates"),
    agent: v.string(),
    type: v.string(),
    content: v.string(),
    order: v.number(),
  }).index("by_debate", ["debateId", "order"]),
});
