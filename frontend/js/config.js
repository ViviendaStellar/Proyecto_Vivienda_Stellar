/* INN-LOCK · Configuración pública del front-end.
   La clave «publishable» de Supabase es pública por diseño: la seguridad real la dan las políticas RLS de la base.
   NUNCA pongas aquí la clave service_role, ninguna llave secreta de Stellar (empieza con S...) ni una frase semilla.
   Los datos de contracts/escrow/deployments/testnet.json son públicos (direcciones G..., ids de contrato C..., hash del wasm):
   copiarlos aquí no es un riesgo, son los mismos que ve cualquiera en el explorador de testnet. */
window.INNLOCK_CONFIG = {
  supabaseUrl: 'https://isixocyvwqvdphywbevv.supabase.co',
  supabaseKey: 'sb_publishable_vF-OiF3tA7km5nT3P9wH9Q_mmHprPT_',

  // --- Cadena (Stellar/Soroban) ---
  // 'simulado' (por defecto): no toca la red, usa datos de ejemplo igual que ?demo=1.
  // 'testnet': lee (y, en un paso posterior, firma) contra la red de pruebas real.
  // Se puede forzar sin tocar este archivo con ?chain=testnet o ?chain=simulado en la URL.
  chainMode: 'simulado',
  stellarNetwork: 'testnet',
  networkPassphrase: 'Test SDF Network ; September 2015',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  escrowContractId: 'CBS57WMMUYBWCLFGEKOZYWPRAHHBFP432AJ57P5HFWK6DD7GRI5WJOBT',
  tokenContractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  explorerUrl: 'https://stellar.expert/explorer/testnet'
};
