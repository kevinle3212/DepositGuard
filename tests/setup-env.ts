import * as os from "os";
import * as path from "path";

// Default Anchor test env when not launched via `anchor test`.
process.env.ANCHOR_PROVIDER_URL ??= "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET ??= path.join(os.homedir(), ".config", "solana", "id.json");
