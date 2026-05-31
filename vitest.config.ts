import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}", "hooks/**/*.test.{ts,tsx}"],
        exclude: ["node_modules", "target", "tests", "services"],
        coverage: {
            reporter: ["text", "lcov"],
            exclude: ["node_modules", "target"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
