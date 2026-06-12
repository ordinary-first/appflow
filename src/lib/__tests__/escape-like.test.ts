import { describe, expect, it } from "vitest";
import { escapeLike } from "@/lib/toggle";

describe("escapeLike (search hardening)", () => {
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("100%_done")).toBe("100\\%\\_done");
  });
  it("escapes backslashes so the escape char itself can't be injected", () => {
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
  it("leaves normal text untouched", () => {
    expect(escapeLike("새벽 코딩 앱")).toBe("새벽 코딩 앱");
  });
});
