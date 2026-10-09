/* INN-LOCK · Obtiene llaves secretas de la CLI de Stellar, solo para estas
   3 identidades exactas, solo en memoria.

   - Nunca se aceptan nombres de identidad por argumento ni por variable de
     entorno: están fijos aquí, así el script no puede pedirle la llave a
     una cuenta distinta aunque alguien lo intente.
   - La cadena de la llave secreta vive en una sola variable local, se usa
     una sola vez para construir el Keypair, y se descarta (`secreto = null`)
     antes de que la función termine. Nunca se imprime, nunca se escribe a
     disco, nunca viaja dentro de un Error.
   - Si `stellar keys secret <nombre>` falla, el mensaje de error solo
     menciona el NOMBRE de la identidad, nunca el motivo crudo del proceso
     hijo (que podría incluir fragmentos de rutas u otra información del
     sistema que no hace falta mostrar). */
'use strict';
const { execFileSync } = require('node:child_process');

const IDENTIDADES = Object.freeze({
  constructora: 'inn-constructora',
  interventor: 'inn-interventor',
  administrador: 'inn-admin'
});

function obtenerKeypair(StellarSdk, rol) {
  const nombre = IDENTIDADES[rol];
  if (!nombre) throw new Error('Rol desconocido: "' + rol + '". Solo se permiten constructora, interventor y administrador.');

  let secreto = null;
  try {
    secreto = execFileSync('stellar', ['keys', 'secret', nombre], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    }).trim();
  } catch (e) {
    throw new Error('No se pudo obtener la llave de "' + nombre + '" con la CLI de Stellar. ¿Existe esa identidad? Revisa con: stellar keys ls');
  }

  try {
    return StellarSdk.Keypair.fromSecret(secreto);
  } catch (e) {
    throw new Error('La CLI devolvió algo que no es una llave secreta válida para "' + nombre + '".');
  } finally {
    secreto = null;
  }
}

module.exports = { IDENTIDADES, obtenerKeypair };
