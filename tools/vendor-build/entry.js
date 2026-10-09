// Entrada del empaquetado: expone el SDK de Stellar y la API de Freighter
// como variables globales, igual que el vendor/supabase.js ya existente.
import * as StellarSdk from '@stellar/stellar-sdk';
import * as freighterApi from '@stellar/freighter-api';

window.StellarSdk = StellarSdk;
window.freighterApi = freighterApi;
