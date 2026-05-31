#!/usr/bin/env node
/**
 * Deletes all documents in: leases, signingTokens
 * Run: node scripts/reset-leases.mjs
 * Requires: firebase CLI logged in, project set to uoo-quackathon26eug-8200
 */

import { execSync } from "child_process";

const PROJECT = "uoo-quackathon26eug-8200";
const COLLECTIONS = ["leases", "signingTokens"];

for (const col of COLLECTIONS) {
    console.log(`Deleting all docs in ${col}...`);
    try {
        execSync(
            `npx -y firebase-tools firestore:delete --project ${PROJECT} --recursive --force /${col}`,
            { stdio: "inherit" },
        );
        console.log(`  ✓ ${col} cleared`);
    } catch (e) {
        console.error(`  ✗ Failed to clear ${col}:`, e.message);
    }
}

console.log("Done.");
