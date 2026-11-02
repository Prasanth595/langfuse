import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTraceComments } from "./useTraceComments";

const mocks = vi.hoisted(() => ({
  isProjectMember: true,
  sessionCounts: vi.fn(),
}));

vi.mock("@/src/features/auth", () => ({
  useIsAuthenticatedAndProjectMember: () => mocks.isProjectMember,
}));
vi.mock("@/src/utils/api", () => ({
  api: {
    comments: {
      getCountByObjectType: {
        useQuery: () => ({ data: new Map([["shared", 3]]), isLoading: false }),
      },
      getCountByObjectId: {
        useQuery: () => ({ data: new Map([["anchor", 1]]), isLoading: false }),
      },
      getTraceCommentCountsBySessionId: { useQuery: mocks.sessionCounts },
    },
  },
}));

describe("useTraceComments session counts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isProjectMember = true;
    mocks.sessionCounts.mockReturnValue({
      data: new Map([
        ["anchor", 1],
        ["sibling", 2],
      ]),
      isLoading: false,
    });
  });

  it("loads sibling trace counts with one session query", () => {
    const { result } = renderHook(() =>
      useTraceComments({
        projectId: "project",
        traceId: "anchor",
        sessionId: "session",
      }),
    );
    expect(mocks.sessionCounts).toHaveBeenCalledWith(
      { projectId: "project", sessionId: "session" },
      { refetchOnMount: false, enabled: true },
    );
    expect(result.current.sessionTraceCommentCounts.get("sibling")).toBe(2);
    expect(result.current.observationCommentCounts?.get("shared")).toBe(3);
  });

  it("ignores cached session counts in trace scope", () => {
    const { result } = renderHook(() =>
      useTraceComments({
        projectId: "project",
        traceId: "anchor",
        sessionId: undefined,
      }),
    );
    expect(mocks.sessionCounts.mock.lastCall?.[1]).toMatchObject({
      enabled: false,
    });
    expect(result.current.sessionTraceCommentCounts.size).toBe(0);
    expect(result.current.traceCommentCount).toBe(1);
  });

  it("does not request session counts for non-members", () => {
    mocks.isProjectMember = false;
    renderHook(() =>
      useTraceComments({
        projectId: "project",
        traceId: "anchor",
        sessionId: "session",
      }),
    );
    expect(mocks.sessionCounts.mock.lastCall?.[1]).toMatchObject({
      enabled: false,
    });
  });
});
