import { Connection, PublicKey, Transaction } from '@solana/web3.js'

const PROGRAM_ID = process.env.DEPOSIT_GUARD_PROGRAM_ID ?? 'F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a'
const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

// record_contract_hash requires the caller to be the landlord or tenant (enforced on-chain).
// The relayer keypair is used as the fee payer, but the caller signer must be the authenticated
// user's wallet. Since the server does not hold the user's private key, this function returns
// a base58-encoded unsigned transaction that the client must sign and submit via their wallet.
// See app/lease/[id]/sign/page.tsx for the client-side submission.
export async function buildRecordContractHashTx(
  leaseId: string,
  contractHash: Uint8Array,
  callerPubkey: string,
): Promise<string> {
  const anchor = await import('@coral-xyz/anchor')
  const { Program, AnchorProvider } = anchor
  // IDL loaded at runtime from the repo root; path is relative to the compiled dist/ output.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const idl = require('../../../../target/idl/deposit_guard.json') as ConstructorParameters<typeof Program>[0]

  const connection = new Connection(RPC_URL, 'confirmed')
  const programId = new PublicKey(PROGRAM_ID)
  const caller = new PublicKey(callerPubkey)

  const [escrowStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), new PublicKey(leaseId).toBuffer()],
    programId,
  )
  const [leaseConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('lease-config'), new PublicKey(leaseId).toBuffer()],
    programId,
  )

  const wallet = {
    publicKey: caller,
    signTransaction: async <T>(tx: T): Promise<T> => tx,
    signAllTransactions: async <T>(txs: T[]): Promise<T[]> => txs,
  }
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const program = new Program(idl, provider)

  const ix = await program.methods
    .recordContractHash(Array.from(contractHash))
    .accounts({ caller, escrowState: escrowStatePda, leaseConfig: leaseConfigPda })
    .instruction()

  const { blockhash } = await connection.getLatestBlockhash()
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: caller })
  tx.add(ix)

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  return Buffer.from(serialized).toString('base64')
}

export async function submitSignedTx(serializedTx: string): Promise<string> {
  const connection = new Connection(RPC_URL, 'confirmed')
  const txBytes = Buffer.from(serializedTx, 'base64')
  const sig = await connection.sendRawTransaction(txBytes, { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
  return sig
}
