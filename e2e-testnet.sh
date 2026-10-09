#!/usr/bin/env bash
# INN-LOCK · Corre la prueba automatizada de punta a punta de tools/e2e-testnet
# desde la raíz del repo, sin tener que hacer `cd` primero.
#
# No usa Freighter ni package.json: firma con las llaves de
# inn-constructora/inn-interventor/inn-admin, obtenidas al vuelo con la CLI
# de Stellar (nunca se guardan en disco). Requiere testnet real, el CLI
# `stellar` instalado y esas 3 identidades ya creadas (`stellar keys ls`).
#
# Uso: ./e2e-testnet.sh
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/tools/e2e-testnet"
node run.js
