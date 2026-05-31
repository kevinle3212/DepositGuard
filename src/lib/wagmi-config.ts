import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon } from "wagmi/chains";

export const chains = [mainnet, polygon] as const;

const projectId = process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"];
if (!projectId) {
    // A real ID from https://cloud.reown.com is required for the WalletConnect
    // relay. Without it the relay drops the subscription, surfacing as
    // "Connection interrupted while trying to subscribe". Warn loudly rather
    // than silently falling back to a bogus placeholder.
    console.warn(
        "[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — EVM/WalletConnect " +
            "wallets will fail to connect. Add it to .env.local (see .env.example).",
    );
}

export const wagmiConfig = getDefaultConfig({
    appName: "NestCrow",
    projectId: projectId ?? "MISSING_WALLETCONNECT_PROJECT_ID",
    chains,
    ssr: true,
});
