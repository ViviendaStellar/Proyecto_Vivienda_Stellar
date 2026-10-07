/**
 * Funciones del contrato ObraContract (contracts/hello-world/src/lib.rs).
 * Si el contrato cambia, este es el único archivo que hay que tocar
 * para adaptar las llamadas.
 */
import { nativeToScVal } from "@stellar/stellar-sdk";
import { invoke, simulate } from "./rpc.js";

const str = (v) => nativeToScVal(String(v), { type: "string" });
const u32 = (v) => nativeToScVal(Number(v), { type: "u32" });

/** obtener_etapa(nombre) -> u32. Devuelve 0 también si la etapa no existe. */
export async function obtenerEtapa(nombre) {
  return Number(await simulate("obtener_etapa", [str(nombre)]));
}

/** crear_etapa(nombre, responsable) -> String */
export function crearEtapa(address, { nombre, responsable }, onStep) {
  return invoke(address, "crear_etapa", [str(nombre), str(responsable)], onStep);
}

/** actualizar_avance(nombre, porcentaje, observaciones) -> String */
export function actualizarAvance(address, { nombre, porcentaje, observaciones }, onStep) {
  return invoke(address, "actualizar_avance", [str(nombre), u32(porcentaje), str(observaciones)], onStep);
}
