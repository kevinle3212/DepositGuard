/**
 * Tangem NFC signing — browser implementation via Web NFC API.
 *
 * Tangem cards use ISO 14443-4 / ISO 7816 APDUs which require native NFC
 * access (iOS / Android SDKs). Standard browsers only expose the NDEF layer
 * via NDEFReader, so this module reads the card's wallet public key from the
 * NDEF text record and requests signing via an NDEF write (Tangem COS ≥ 4.x).
 *
 * On platforms that don't support Web NFC this throws TangemNfcUnavailable.
 */

export class TangemNfcUnavailable extends Error {
    constructor() {
        super(
            "Web NFC is not supported in this browser. Use Chrome on Android, or open DepositGuard in the Tangem mobile app.",
        );
        this.name = "TangemNfcUnavailable";
    }
}

export class TangemUserAborted extends Error {
    constructor() {
        super("NFC session cancelled.");
        this.name = "TangemUserAborted";
    }
}

// Minimal type for the Web NFC NDEFReader API (not yet in lib.dom.d.ts).
interface NDEFRecord {
    recordType: string;
    data: DataView;
}
interface NDEFMessage {
    records: NDEFRecord[];
}
interface NDEFReadingEvent extends Event {
    message: NDEFMessage;
}
interface NDEFMessageInit {
    records: { recordType: string; data: ArrayBuffer }[];
}
interface NDEFReaderInstance {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    write(message: NDEFMessageInit, options?: { signal?: AbortSignal }): Promise<void>;
    addEventListener(event: "reading", handler: (e: NDEFReadingEvent) => void): void;
}

interface WindowWithNFC {
    NDEFReader: new () => NDEFReaderInstance;
}

function getNDEFReader(): new () => NDEFReaderInstance {
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
        throw new TangemNfcUnavailable();
    }
    return (window as unknown as WindowWithNFC).NDEFReader;
}

function createReader(): NDEFReaderInstance {
    const NDEFReader = getNDEFReader();
    return new NDEFReader();
}

/**
 * Scan a Tangem card and return its wallet public key (base58).
 * The card's NDEF text record must follow the format "tangem:<base58-pubkey>".
 */
export async function scanTangemCard(signal: AbortSignal): Promise<string> {
    const reader = createReader();

    return new Promise<string>((resolve, reject) => {
        signal.addEventListener("abort", () => {
            reject(new TangemUserAborted());
        });

        reader.addEventListener("reading", (event: NDEFReadingEvent) => {
            for (const record of event.message.records) {
                if (record.recordType === "text") {
                    const text = new TextDecoder().decode(record.data);
                    // Tangem NDEF text record format: "tangem:<base58-pubkey>"
                    const match = /^tangem:([1-9A-HJ-NP-Za-km-z]{32,44})$/.exec(text.trim());
                    const pubkey = match?.[1];
                    if (pubkey !== undefined && pubkey.length > 0) {
                        resolve(pubkey);
                        return;
                    }
                }
            }
            reject(new Error("Could not read wallet public key from Tangem card NDEF record."));
        });

        reader.scan({ signal }).catch(reject);
    });
}

/**
 * Have the Tangem card sign `message` with its Ed25519 key.
 * Returns the base64-encoded 64-byte signature.
 */
export async function tangemSign(message: string, signal: AbortSignal): Promise<string> {
    const reader = createReader();

    const msgBytes = new TextEncoder().encode(message).buffer as ArrayBuffer;
    const challengeRecord: NDEFMessageInit = {
        records: [{ recordType: "mime", data: msgBytes }],
    };

    return new Promise<string>((resolve, reject) => {
        signal.addEventListener("abort", () => {
            reject(new TangemUserAborted());
        });

        // The card writes back its 64-byte Ed25519 signature as a MIME NDEF record.
        reader.addEventListener("reading", (event: NDEFReadingEvent) => {
            for (const record of event.message.records) {
                if (record.recordType === "mime") {
                    const bytes = new Uint8Array(record.data.buffer);
                    if (bytes.length === 64) {
                        resolve(Buffer.from(bytes).toString("base64"));
                        return;
                    }
                }
            }
            reject(new Error("Tangem card did not return a valid signature."));
        });

        reader.write(challengeRecord, { signal }).catch(reject);
    });
}
