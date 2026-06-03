import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Disable retry backoff so engine-fallback tests run fast and deterministically.
    env: {
      MAX_RETRIES: "0",
    },
  },
});
