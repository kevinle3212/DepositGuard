// Type shim: @solana/wallet-adapter-wallets has types at lib/types but
// doesn't expose them via the package.json "exports" field, which bundler
// moduleResolution requires. Re-exporting from the raw path fixes this.
declare module "@solana/wallet-adapter-wallets" {
    export { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
    export { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
    export { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
}
