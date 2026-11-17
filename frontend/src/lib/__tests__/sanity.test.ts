import { afterEach, describe, expect, it, vi } from "vitest";

describe("lib/sanity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("no lanza al importarse sin las variables de entorno", async () => {
    vi.stubEnv("VITE_SANITY_PROJECT_ID", "");
    vi.stubEnv("VITE_SANITY_DATASET", "");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();

    const mod = await import("../sanity");

    expect(mod.client).toBeDefined();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("VITE_SANITY_PROJECT_ID"),
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("VITE_SANITY_DATASET"),
    );
  });
});
