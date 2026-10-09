/* INN-LOCK · Arma un proyecto de ejemplo para la prueba: uuid nuevo en cada
   corrida (para que "registrarlo dos veces" sea realmente una segunda vez
   del MISMO proyecto, y no choque con corridas anteriores), presupuesto
   pequeño y 6 hitos que suman exactamente 10000 puntos base (100%). */
'use strict';
const crypto = require('node:crypto');

const DIA = 86400;

function construirProyectoMuestra(deployment, direcciones) {
  const ahora = Math.floor(Date.now() / 1000);
  const bps = [1700, 1700, 1700, 1700, 1700, 1500]; // suma 10000
  const hitos = bps.map((percentageBps, i) => ({
    deadline: ahora + (i + 1) * 30 * DIA,
    percentageBps
  }));
  return {
    projectId: crypto.randomUUID(),
    constructora: direcciones.constructora,
    interventor: direcciones.interventor,
    administrador: direcciones.administrador,
    token: deployment.token_contract_id,
    presupuestoTotal: '1000000', // presupuesto pequeño, en unidades del token de prueba
    hitos
  };
}

module.exports = { construirProyectoMuestra };
