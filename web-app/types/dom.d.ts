// web-app/types/dom.d.ts
/// <reference lib="dom" />

import { PublicKey, Transaction } from '@solana/web3.js';

declare global {
  interface Window {
    phantom?: {
      solana?: {
        connect(): Promise<{ publicKey: PublicKey }>;
        signTransaction(transaction: Transaction): Promise<Transaction>;
        signAndSendTransaction(transaction: Transaction): Promise<{ signature: string }>;
        disconnect(): Promise<void>;
        isConnected: boolean;
        publicKey?: PublicKey;
      };
    };
  }
}