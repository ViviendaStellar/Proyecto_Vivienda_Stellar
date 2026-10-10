/* INN-LOCK · Traduce los códigos del enum `Error` de contracts/escrow a
   mensajes en español. Cuando el contrato rechaza una transacción con
   `Err(Error::X)`, el RPC lo reporta como texto "Error(Contract, #N)" (en la
   simulación, en sim.error; al enviar, en la respuesta o en los eventos de
   diagnóstico) — este módulo busca ese patrón y devuelve el mensaje claro.
   Se reutiliza en todos los pasos siguientes que invoquen el contrato. */
(function () {
  'use strict';

  // Debe coincidir exactamente con `pub enum Error` en
  // contracts/escrow/contracts/escrow/src/lib.rs (34 códigos, del 1 al 34).
  const MENSAJES = {
    1: 'Este proyecto ya está registrado: no se puede registrar dos veces.',
    2: 'El presupuesto debe ser mayor que cero.',
    3: 'El cronograma debe tener entre 6 y 60 hitos.',
    4: 'Un hito supera el porcentaje máximo permitido para la cantidad de hitos del cronograma.',
    5: 'La fecha límite debe ser posterior al momento actual.',
    6: 'Las fechas límite del cronograma deben ir siempre en orden creciente.',
    7: 'Los porcentajes de los hitos no suman exactamente 100% (10000 puntos base).',
    8: 'Este proyecto no existe en el contrato.',
    9: 'Ese hito no existe en el cronograma del proyecto.',
    10: 'El monto debe ser mayor que cero.',
    11: 'Ese hito no está "en curso": no se puede reportar en su estado actual.',
    12: 'Hacen falta fotos: se exigen al menos 3.',
    13: 'La huella (hash) de la evidencia no puede estar vacía.',
    14: 'Todavía no hay un reporte de avance para ese hito.',
    15: 'La constructora tiene documentos legales vencidos: el administrador debe ponerla al día (set_compliance) antes de poder certificar o cobrar.',
    16: 'El proyecto está congelado: esta acción queda bloqueada hasta que el administrador lo descongele.',
    17: 'Ese hito no está "reportado": no se puede certificar ni observar en su estado actual.',
    18: 'La huella (hash) de la evidencia no coincide con la que reportó la constructora.',
    19: 'Ese hito no tiene ningún saldo pendiente por cobrar.',
    20: 'Desbordamiento aritmético al calcular un monto: los números involucrados son demasiado grandes.',
    21: 'Todavía no hay una certificación registrada para ese hito.',
    22: 'Ese hito no se puede marcar como vencido en su estado actual.',
    23: 'Ese hito todavía no ha vencido: la fecha límite no ha pasado.',
    24: 'Ese hito ya estaba marcado como vencido; no se puede marcar dos veces.',
    25: 'El proyecto ya estaba congelado.',
    26: 'El proyecto no está congelado: no se puede descongelar.',
    27: 'Ya hay una solicitud de cambio de cronograma pendiente; hay que resolverla antes de crear otra.',
    28: 'Ese hito no se puede modificar: solo los hitos "pendientes" admiten cambios de cronograma.',
    29: 'La solicitud repite el mismo hito más de una vez.',
    30: 'La suma de los porcentajes nuevos no coincide con la suma de los porcentajes actuales de los hitos tocados.',
    31: 'No hay ninguna solicitud de cambio de cronograma pendiente para resolver.',
    32: 'Ese hito no tiene ningún registro de vencimiento guardado.',
    33: 'Este proyecto nunca se ha congelado: no hay historial de congelamiento.',
    34: 'No hay ninguna solicitud de cambio de cronograma guardada para este proyecto.'
  };

  /** Busca "Error(Contract, #N)" en un texto y devuelve N, o null si no está. */
  function extraerCodigo(texto) {
    const m = String(texto == null ? '' : texto).match(/Error\(Contract,\s*#(\d+)\)/);
    return m ? Number(m[1]) : null;
  }

  /** Mensaje en español para un código de error del contrato, o null si no se reconoce. */
  function mensajeParaCodigo(codigo) {
    return Object.prototype.hasOwnProperty.call(MENSAJES, codigo) ? MENSAJES[codigo] : null;
  }

  /**
   * Traduce cualquier error (string, Error, o respuesta de simulación/envío)
   * a un mensaje en español. Si no es un error del contrato reconocible,
   * devuelve el mensaje original tal cual (mejor eso que inventar algo).
   */
  function traducir(origen) {
    const texto = origen && origen.message ? origen.message : String(origen == null ? '' : origen);
    const codigo = extraerCodigo(texto);
    if (codigo != null) {
      const mensaje = mensajeParaCodigo(codigo);
      if (mensaje) return mensaje;
      return 'El contrato rechazó la operación con el código #' + codigo + ' (no reconocido por esta versión del frontend).';
    }
    return texto || 'Ocurrió un error inesperado.';
  }

  window.ChainErrors = { MENSAJES, extraerCodigo, mensajeParaCodigo, traducir };
})();
