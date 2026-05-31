import admin from "firebase-admin";

function db(): admin.firestore.Firestore {
    if (!admin.apps.length) admin.initializeApp();
    return admin.firestore();
}

export async function storeSigningToken(
    token: string,
    leaseId: string,
    role: string,
    email: string,
): Promise<void> {
    const firestore = db();
    await firestore.doc(`signingTokens/${token}`).create({
        leaseId,
        role,
        email,
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

export async function invalidateSigningToken(token: string): Promise<void> {
    const firestore = db();
    await firestore.doc(`signingTokens/${token}`).update({ used: true });
}

export async function recordSignature(
    leaseId: string,
    role: "landlord" | "tenant",
    walletPubkey: string,
    signatureB64: string,
    signedMessage: string,
): Promise<void> {
    const firestore = db();
    const ts = admin.firestore.FieldValue.serverTimestamp();

    const field = role === "landlord" ? "landlordSignature" : "tenantSignature";
    await firestore.doc(`leases/${leaseId}`).set(
        {
            [field]: {
                walletPubkey,
                signatureB64,
                signedMessage,
                signedAt: ts,
            },
        },
        { merge: true },
    );
}

// Dispatches a magic-link email via the Firebase Extensions "Trigger Email" collection.
export async function dispatchMagicLinkEmail(
    email: string,
    leaseId: string,
    role: string,
    signingUrl: string,
): Promise<void> {
    const firestore = db();
    await firestore.collection("mail").add({
        to: email,
        template: {
            name: "magic-link-invite",
            data: { leaseId, role, signingUrl },
        },
    });
}
