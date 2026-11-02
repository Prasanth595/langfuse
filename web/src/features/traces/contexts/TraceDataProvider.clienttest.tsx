import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TraceDataProvider, useTraceData } from "./TraceDataProvider";
import { type TreeNode } from "../types/treeNode";

vi.mock("./ViewPreferencesProvider", () => ({
  useViewPreferences: () => ({ minObservationLevel: "DEBUG" }),
}));
vi.mock("@/src/features/scores", () => ({ useMergedScores: () => [] }));

// The tree builder's collision handling is covered in treeBuilding.clienttest.ts.
vi.mock("../fns/treeBuilding", async (importOriginal) => {
  const original = await importOriginal<typeof import("../fns/treeBuilding")>();
  const nodes: TreeNode[] = (
    [
      ["trace-anchor", "anchor", "TRACE"],
      ["trace-sibling", "sibling", "TRACE"],
      ["anchor:shared", "anchor", "SPAN"],
      ["sibling:shared", "sibling", "SPAN"],
    ] as const
  ).map(([id, traceId, type]) => ({
    id,
    traceId,
    type,
    observationId: type === "TRACE" ? undefined : "shared",
    name: id,
    startTime: new Date("2026-01-01"),
    depth: 0,
    startTimeSinceTrace: 0,
    startTimeSinceParentStart: null,
    childrenDepth: 0,
    children: [],
  }));
  return {
    ...original,
    buildTraceUiData: () => ({
      roots: nodes,
      nodeMap: new Map(nodes.map((node) => [node.id, node])),
      searchItems: [],
      metricEmphasis: { wholeTraceNodeIds: new Set(), totals: {} },
    }),
  };
});

const trace = {
  id: "anchor",
  name: "Anchor",
  projectId: "project",
  timestamp: new Date("2026-01-01"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  public: false,
  bookmarked: false,
  metadata: "{}",
  release: null,
  version: null,
  userId: null,
  sessionId: "session",
  input: null,
  output: null,
  tags: [],
  environment: "default",
};
const comments = new Map([
  ["anchor", 1],
  ["sibling", 2],
  ["shared", 3],
]);

function CommentCounts() {
  const { comments } = useTraceData();
  return <output>{JSON.stringify(Object.fromEntries(comments))}</output>;
}

describe("TraceDataProvider comment IDs", () => {
  it("maps session trace and colliding observation nodes while retaining raw IDs", () => {
    render(
      <TraceDataProvider
        trace={trace}
        sessionTraces={[trace, { ...trace, id: "sibling" }]}
        observations={[]}
        serverScores={[]}
        corrections={[]}
        comments={comments}
      >
        <CommentCounts />
      </TraceDataProvider>,
    );
    expect(JSON.parse(screen.getByRole("status").textContent ?? "{}")).toEqual({
      anchor: 1,
      sibling: 2,
      shared: 3,
      "trace-anchor": 1,
      "trace-sibling": 2,
      "anchor:shared": 3,
      "sibling:shared": 3,
    });
  });

  it("leaves trace-scope comment IDs unchanged", () => {
    render(
      <TraceDataProvider
        trace={trace}
        observations={[]}
        serverScores={[]}
        corrections={[]}
        comments={comments}
      >
        <CommentCounts />
      </TraceDataProvider>,
    );
    expect(JSON.parse(screen.getByRole("status").textContent ?? "{}")).toEqual(
      Object.fromEntries(comments),
    );
  });
});
