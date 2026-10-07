#![cfg(test)]

use super::*;
use soroban_sdk::{Env, String};

/// Crea un entorno de prueba con el contrato registrado.
fn setup() -> (Env, ObraContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(ObraContract, ());
    let client = ObraContractClient::new(&env, &contract_id);
    (env, client)
}

/// Lee la etapa completa directamente del almacenamiento del contrato.
fn leer_etapa(env: &Env, client: &ObraContractClient, nombre: &String) -> (u32, String, String) {
    env.as_contract(&client.address, || {
        env.storage().instance().get(nombre).unwrap()
    })
}

#[test]
fn crear_etapa_inicia_en_cero() {
    let (env, client) = setup();
    let nombre = String::from_str(&env, "Cimentacion");

    let respuesta = client.crear_etapa(&nombre, &String::from_str(&env, "Ing. Laura Perez"));

    assert_eq!(respuesta, String::from_str(&env, "Etapa creada"));
    assert_eq!(client.obtener_etapa(&nombre), 0);
}

#[test]
fn actualizar_avance_cambia_el_porcentaje() {
    let (env, client) = setup();
    let nombre = String::from_str(&env, "Estructura");
    client.crear_etapa(&nombre, &String::from_str(&env, "Arq. Diego Ramos"));

    let respuesta = client.actualizar_avance(&nombre, &50, &String::from_str(&env, "Columnas coladas"));

    assert_eq!(respuesta, String::from_str(&env, "Avance actualizado"));
    assert_eq!(client.obtener_etapa(&nombre), 50);
}

#[test]
fn actualizar_avance_conserva_el_responsable() {
    let (env, client) = setup();
    let nombre = String::from_str(&env, "Muros");
    let responsable = String::from_str(&env, "Ing. Ana Torres");
    client.crear_etapa(&nombre, &responsable);

    client.actualizar_avance(&nombre, &75, &String::from_str(&env, "Falta enjarre"));

    let (porcentaje, guardado, observaciones) = leer_etapa(&env, &client, &nombre);
    assert_eq!(porcentaje, 75);
    assert_eq!(guardado, responsable);
    assert_eq!(observaciones, String::from_str(&env, "Falta enjarre"));
}

#[test]
fn rechaza_porcentaje_mayor_a_cien() {
    let (env, client) = setup();
    let nombre = String::from_str(&env, "Acabados");
    client.crear_etapa(&nombre, &String::from_str(&env, "Ing. Laura Perez"));
    client.actualizar_avance(&nombre, &40, &String::from_str(&env, "Avance parcial"));

    let respuesta = client.actualizar_avance(&nombre, &101, &String::from_str(&env, "Error"));

    assert_eq!(respuesta, String::from_str(&env, "Porcentaje inválido"));
    assert_eq!(client.obtener_etapa(&nombre), 40);
}

#[test]
fn acepta_cien_por_ciento() {
    let (env, client) = setup();
    let nombre = String::from_str(&env, "Preliminares");
    client.crear_etapa(&nombre, &String::from_str(&env, "Ing. Ana Torres"));

    client.actualizar_avance(&nombre, &100, &String::from_str(&env, "Terminada"));

    assert_eq!(client.obtener_etapa(&nombre), 100);
}

#[test]
fn etapa_inexistente_devuelve_cero() {
    let (env, client) = setup();

    assert_eq!(client.obtener_etapa(&String::from_str(&env, "No existe")), 0);
}

#[test]
fn las_etapas_son_independientes() {
    let (env, client) = setup();
    let a = String::from_str(&env, "Cimentacion");
    let b = String::from_str(&env, "Estructura");
    client.crear_etapa(&a, &String::from_str(&env, "Ing. Laura Perez"));
    client.crear_etapa(&b, &String::from_str(&env, "Arq. Diego Ramos"));

    client.actualizar_avance(&a, &60, &String::from_str(&env, "Avance"));

    assert_eq!(client.obtener_etapa(&a), 60);
    assert_eq!(client.obtener_etapa(&b), 0);
}
