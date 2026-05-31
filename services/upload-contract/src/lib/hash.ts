import { createHash } from "crypto";

export function sha256Hex(data: Buffer): string {
    return createHash("sha256").update(data).digest("hex");
}

export function sha256Bytes(data: Buffer): Uint8Array {
    return new Uint8Array(createHash("sha256").update(data).digest());
}
