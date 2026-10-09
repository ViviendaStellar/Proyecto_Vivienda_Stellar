/* INN-LOCK · JSON canónico del cronograma y su huella SHA-256 (hash_cronograma).
   Es el mismo formato que calcula la constructora al proponer el proyecto y
   que el interventor vuelve a calcular para comprobar, antes de firmar, que
   nadie cambió nada.

   Esquema (claves en este orden exacto, sin espacios — JSON.stringify ya
   produce texto sin espacios, y el orden de las claves es el que aparece
   abajo en la construcción del objeto, no el de JS "ordenando" nada):

   {
     "administrador": "G...",
     "constructora": "G...",
     "hitos": [ { "deadline": <segundos>, "percentage_bps": <entero> }, ... ],
     "interventor": "G...",
     "presupuesto_total": "<stroops, como texto>",
     "project_id": "<uuid>",
     "token": "C..."
   }

   `presupuesto_total` va como texto, no como número: en JavaScript los
   números solo son exactos hasta 2^53 y un presupuesto grande en stroops
   puede superarlo. Igual con cada `deadline`/`percentage_bps`: son enteros
   pequeños (segundos Unix, puntos base), esos sí caben de sobra en un
   número de JS sin perder precisión. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./hash.js'));
  else root.ChainCanonical = factory(root.ChainHash);
})(typeof self !== 'undefined' ? self : this, function (ChainHash) {
  'use strict';

  function canonicalJson(project) {
    const hitos = (project.hitos || []).map((h) => ({
      deadline: Number(h.deadline),
      percentage_bps: Number(h.percentageBps != null ? h.percentageBps : h.percentage_bps)
    }));
    const datos = {
      administrador: String(project.administrador),
      constructora: String(project.constructora),
      hitos,
      interventor: String(project.interventor),
      presupuesto_total: String(project.presupuestoTotal != null ? project.presupuestoTotal : project.presupuesto_total),
      project_id: String(project.projectId != null ? project.projectId : project.project_id),
      token: String(project.token)
    };
    return JSON.stringify(datos);
  }

  async function hashProject(project) {
    const json = canonicalJson(project);
    const hex = await ChainHash.sha256Hex(json);
    return { json, hex };
  }

  return { canonicalJson, hashProject };
});
