/**
 * Configuración de red y contrato.
 * Los valores se leen de `.env` (ver `.env.example`).
 */
import { Networks } from "@stellar/stellar-sdk";

export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CB3TZ3LS7TDSBKSNFXNY6H6AQE4VO6B522UYL3YARV7HL3AOWPQYO2K7";

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const NETWORK_NAME = "testnet";
export const NETWORK_LABEL = "Stellar Testnet";
export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

export const explorerTx = (hash) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerContract = (id = CONTRACT_ID) => `${EXPLORER_URL}/contract/${id}`;
