import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";

export const chains = [mainnet, polygon] as const;

export const wagmiConfig = getDefaultConfig({
    appName: "NestCrow",
    projectId:
        process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ?? "6c6170df7553a4a46bc21e4dee335e8c",
    chains,
    ssr: true,
    // Override RainbowKit's default transport (https://eth.merkle.io), which
    // blocks browser requests with no CORS header. publicnode serves the
    // Access-Control-Allow-Origin header so reads work from localhost.
    transports: {
        [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
        [polygon.id]: http("https://polygon-bor-rpc.publicnode.com"),
    },
});
