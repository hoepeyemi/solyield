import { PublicKey, Transaction } from '@solana/web3.js';
import { helius } from '@/components/dashboard/config';
import bs58 from 'bs58';

/**
 * Creates a transaction to stake SOL with Helius.
 * @param ownerPublicKey The public key of the wallet owner.
 * @param amountInSol The amount of SOL to stake.
 * @returns A promise that resolves to an object containing the transaction and the new stake account's public key.
 */
export const createStakeTransaction = async (
  ownerPublicKey: PublicKey,
  amountInSol: number
): Promise<{ transaction: Transaction; stakeAccountPubkey: PublicKey }> => {
  const { serializedTx, stakeAccountPubkey } =
    await helius.rpc.createStakeTransaction(ownerPublicKey.toBase58(), amountInSol);
  
  const transaction = Transaction.from(bs58.decode(serializedTx));
  
  return { transaction, stakeAccountPubkey };
};

/**
 * Creates a transaction to unstake SOL from a Helius stake account.
 * @param ownerPublicKey The public key of the wallet owner.
 * @param stakeAccountPubkey The public key of the stake account.
 * @returns A promise that resolves to the unstake transaction.
 */
export const createUnstakeTransaction = async (
  ownerPublicKey: PublicKey,
  stakeAccountPubkey: PublicKey,
): Promise<Transaction> => {
  const serializedTx = await helius.rpc.createUnstakeTransaction(
    ownerPublicKey.toBase58(),
    stakeAccountPubkey.toBase58()
  );
  const transaction = Transaction.from(bs58.decode(serializedTx));
  return transaction;
};

/**
 * Gets the withdrawable amount from a stake account.
 * @param stakeAccountPubkey The public key of the stake account.
 * @param includeRentExempt Whether to include the rent-exempt minimum in the amount.
 * @returns A promise that resolves to the withdrawable amount in lamports.
 */
export const getWithdrawableAmount = async (
  stakeAccountPubkey: PublicKey,
  includeRentExempt: boolean = false
): Promise<number> => {
  return await helius.rpc.getWithdrawableAmount(stakeAccountPubkey.toBase58(), includeRentExempt);
};

/**
 * Creates a transaction to withdraw SOL from a stake account.
 * @param ownerPublicKey The public key of the wallet owner.
 * @param stakeAccountPubkey The public key of the stake account.
 * @param destinationPubkey The public key of the destination account.
 * @param amount The amount to withdraw in lamports.
 * @returns A promise that resolves to the withdraw transaction.
 */
export const createWithdrawTransaction = async (
  ownerPublicKey: PublicKey,
  stakeAccountPubkey: PublicKey,
  destinationPubkey: PublicKey,
  amount: number
): Promise<Transaction> => {
  const instruction = helius.rpc.getWithdrawInstruction(
    ownerPublicKey.toBase58(),
    stakeAccountPubkey.toBase58(),
    destinationPubkey.toBase58(),
    amount
  );
  const transaction = new Transaction().add(instruction);
  return transaction;
};

/**
 * Gets all stake accounts delegated to Helius for a given wallet.
 * @param walletPubkey The public key of the wallet.
 * @returns A promise that resolves to an array of stake accounts.
 */
export const getHeliusStakeAccounts = async (walletPubkey: PublicKey): Promise<any[]> => {
    return await helius.rpc.getHeliusStakeAccounts(walletPubkey.toBase58());
}; 