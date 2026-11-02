import { describe, expect, it } from "vitest";
import { resolveTraceScope } from "./resolveTraceScope";

const eligibleScope = {
  internalFeaturesEnabled: true,
  isV4: true,
  isProjectMember: true,
  sessionId: "session-1",
  aggregation: "session",
  context: "fullscreen" as const,
};

describe("resolveTraceScope", () => {
  it("enables session scope for eligible traces", () => {
    expect(resolveTraceScope(eligibleScope)).toEqual({
      showScopeToggle: true,
      canSelectSession: true,
      isSessionScope: true,
    });
  });

  it.each([
    { internalFeaturesEnabled: false },
    { isV4: false },
    { isProjectMember: false },
    { sessionId: null },
    { sessionId: "" },
    { context: "annotation" as const },
  ])("ignores session aggregation when ineligible: %j", (overrides) => {
    expect(resolveTraceScope({ ...eligibleScope, ...overrides })).toMatchObject(
      {
        canSelectSession: false,
        isSessionScope: false,
      },
    );
  });

  it.each([undefined, "trace", ["session"]])(
    "requires explicit session aggregation: %j",
    (aggregation) => {
      expect(resolveTraceScope({ ...eligibleScope, aggregation })).toEqual({
        showScopeToggle: true,
        canSelectSession: true,
        isSessionScope: false,
      });
    },
  );

  it.each([{ internalFeaturesEnabled: false }, { isV4: false }])(
    "hides the scope toggle outside internal v4 views: %j",
    (overrides) => {
      expect(
        resolveTraceScope({ ...eligibleScope, ...overrides }).showScopeToggle,
      ).toBe(false);
    },
  );
});
