#![no_std]
use soroban_sdk::{contract, contractimpl, Env, String};

/// Registro del avance de una obra por etapas.
///
/// Cada etapa se guarda con su nombre como clave y el valor
/// `(porcentaje, responsable, observaciones)`.
#[contract]
pub struct ObraContract;

#[contractimpl]
impl ObraContract {
    /// Crea una etapa con 0 % de avance.
    pub fn crear_etapa(env: Env, nombre: String, responsable: String) -> String {
        env.storage().instance().set(
            &nombre,
            &(0u32, responsable, String::from_str(&env, "Sin observaciones")),
        );

        String::from_str(&env, "Etapa creada")
    }

    /// Cambia el porcentaje y las observaciones de una etapa.
    /// Conserva el responsable que se registró al crearla.
    pub fn actualizar_avance(
        env: Env,
        nombre: String,
        porcentaje: u32,
        observaciones: String,
    ) -> String {
        if porcentaje > 100 {
            return String::from_str(&env, "Porcentaje inválido");
        }

        let responsable = env
            .storage()
            .instance()
            .get::<String, (u32, String, String)>(&nombre)
            .map(|etapa| etapa.1)
            .unwrap_or_else(|| String::from_str(&env, ""));

        env.storage()
            .instance()
            .set(&nombre, &(porcentaje, responsable, observaciones));

        String::from_str(&env, "Avance actualizado")
    }

    /// Devuelve el porcentaje de una etapa, o 0 si no existe.
    pub fn obtener_etapa(env: Env, nombre: String) -> u32 {
        env.storage()
            .instance()
            .get::<String, (u32, String, String)>(&nombre)
            .map(|etapa| etapa.0)
            .unwrap_or(0)
    }
}

mod test;
