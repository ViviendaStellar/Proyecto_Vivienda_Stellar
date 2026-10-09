#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{storage::Persistent as _, Address as _, Ledger, MockAuth, MockAuthInvoke},
    token, Address, BytesN, Env, IntoVal, Val, Vec,
};

const PRESUPUESTO: i128 = 1_000_000;

/// Entorno base: red de prueba con el reloj fijo en un instante conocido,
/// el contrato desplegado y las direcciones de los tres roles + el token.
fn setup() -> (Env, Address, Address, Address, Address, Address, BytesN<16>, BytesN<32>) {
    let env = Env::default();
    env.ledger().set_timestamp(1_000_000);
    let contract_id = env.register(EscrowContract, ());
    let constructora = Address::generate(&env);
    let interventor = Address::generate(&env);
    let administrador = Address::generate(&env);
    let token = Address::generate(&env);
    let project_id = BytesN::from_array(&env, &[7u8; 16]);
    let hash_cronograma = BytesN::from_array(&env, &[9u8; 32]);
    (
        env,
        contract_id,
        constructora,
        interventor,
        administrador,
        token,
        project_id,
        hash_cronograma,
    )
}

/// 6 hitos válidos: suman 10000 bps y ninguno supera el tope (3333 bps para 6 hitos).
fn hitos_validos(env: &Env, inicio: u64) -> Vec<MilestoneInput> {
    let porcentajes = [1700u32, 1700, 1700, 1700, 1700, 1500];
    let mut hitos = Vec::new(env);
    for (i, pct) in porcentajes.iter().enumerate() {
        hitos.push_back(MilestoneInput {
            percentage_bps: *pct,
            deadline: inicio + 1000 * (i as u64 + 1),
        });
    }
    hitos
}

/// `n` hitos con valores que no importan (para probar el rechazo por cantidad,
/// que se valida antes de mirar porcentajes o fechas).
fn hitos_cantidad(env: &Env, n: u32, inicio: u64) -> Vec<MilestoneInput> {
    let mut hitos = Vec::new(env);
    for i in 0..n {
        hitos.push_back(MilestoneInput {
            percentage_bps: 100,
            deadline: inicio + 1000 * (i as u64 + 1),
        });
    }
    hitos
}

/// 7 hitos cuyo porcentaje no se reparte exacto entre todos (10000/7 no es
/// entero), para probar que la suma de los montos sigue siendo el presupuesto.
fn hitos_no_exactos(env: &Env, inicio: u64) -> Vec<MilestoneInput> {
    let porcentajes = [1429u32, 1429, 1429, 1429, 1429, 1429, 1426];
    let mut hitos = Vec::new(env);
    for (i, pct) in porcentajes.iter().enumerate() {
        hitos.push_back(MilestoneInput {
            percentage_bps: *pct,
            deadline: inicio + 1000 * (i as u64 + 1),
        });
    }
    hitos
}

fn args_register_project(
    env: &Env,
    project_id: &BytesN<16>,
    constructora: &Address,
    interventor: &Address,
    administrador: &Address,
    token: &Address,
    hash: &BytesN<32>,
    hitos: &Vec<MilestoneInput>,
) -> Vec<Val> {
    (
        project_id.clone(),
        constructora.clone(),
        interventor.clone(),
        administrador.clone(),
        token.clone(),
        PRESUPUESTO,
        hash.clone(),
        hitos.clone(),
    )
        .into_val(env)
}

/// Un activo de prueba (Stellar Asset Contract) con `admin` como emisor, listo
/// para `mint` y `transfer` como lo haría un token real en testnet.
fn crear_token<'a>(env: &Env, admin: &Address) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(env, &sac.address()),
        token::StellarAssetClient::new(env, &sac.address()),
    )
}

/// Registra un proyecto válido de 6 hitos con las direcciones dadas, aprobando
/// las 3 firmas. Lo usan las pruebas de depósito y de reporte, que no están
/// probando el registro en sí.
fn registrar_proyecto(
    env: &Env,
    client: &EscrowContractClient<'_>,
    project_id: &BytesN<16>,
    constructora: &Address,
    interventor: &Address,
    administrador: &Address,
    token: &Address,
    hash: &BytesN<32>,
) {
    env.mock_all_auths();
    let hitos = hitos_validos(env, env.ledger().timestamp());
    client.register_project(
        project_id,
        constructora,
        interventor,
        administrador,
        token,
        &PRESUPUESTO,
        hash,
        &hitos,
    );
}

#[test]
fn registra_proyecto_con_6_hitos() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let hitos = hitos_validos(&env, env.ledger().timestamp());

    client.register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );

    let project = client.get_project(&project_id);
    assert_eq!(project.constructora, constructora);
    assert_eq!(project.interventor, interventor);
    assert_eq!(project.administrador, administrador);
    assert!(project.activo);
    assert!(!project.congelado);

    let hito0 = client.get_milestone(&project_id, &0);
    assert_eq!(hito0.status, MilestoneStatus::EnCurso);
    let hito1 = client.get_milestone(&project_id, &1);
    assert_eq!(hito1.status, MilestoneStatus::Pendiente);
}

#[test]
fn rechaza_suma_de_porcentajes_invalida() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let ahora = env.ledger().timestamp();

    let mut hitos = Vec::new(&env);
    for (i, pct) in [1700u32, 1700, 1700, 1700, 1700, 1400].iter().enumerate() {
        hitos.push_back(MilestoneInput {
            percentage_bps: *pct,
            deadline: ahora + 1000 * (i as u64 + 1),
        });
    }

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::SumaPorcentajesInvalida)));
}

#[test]
fn rechaza_hito_que_excede_el_tope() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let ahora = env.ledger().timestamp();

    // Con 6 hitos el tope es max(1500, 20000/6) = 3333 bps. El primero lo excede.
    let mut hitos = Vec::new(&env);
    for (i, pct) in [4000u32, 1200, 1200, 1200, 1200, 1200].iter().enumerate() {
        hitos.push_back(MilestoneInput {
            percentage_bps: *pct,
            deadline: ahora + 1000 * (i as u64 + 1),
        });
    }

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::HitoExcedeTope)));
}

#[test]
fn rechaza_menos_de_6_hitos() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let hitos = hitos_cantidad(&env, 5, env.ledger().timestamp());

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::CantidadHitosInvalida)));
}

#[test]
fn rechaza_mas_de_60_hitos() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let hitos = hitos_cantidad(&env, 61, env.ledger().timestamp());

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::CantidadHitosInvalida)));
}

#[test]
fn rechaza_fechas_que_no_van_en_orden() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let ahora = env.ledger().timestamp();

    let deadlines = [ahora + 1000, ahora + 500, ahora + 2000, ahora + 3000, ahora + 4000, ahora + 5000];
    let mut hitos = Vec::new(&env);
    for (i, pct) in [1700u32, 1700, 1700, 1700, 1700, 1500].iter().enumerate() {
        hitos.push_back(MilestoneInput {
            percentage_bps: *pct,
            deadline: deadlines[i],
        });
    }

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::FechasNoCrecientes)));
}

#[test]
fn rechaza_presupuesto_invalido() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let hitos = hitos_validos(&env, env.ledger().timestamp());

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &0i128,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::PresupuestoInvalido)));
}

#[test]
fn rechaza_primera_fecha_limite_ya_pasada() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let ahora = env.ledger().timestamp();

    // El primer hito vence en el mismo instante del registro: no es "posterior".
    let mut hitos = Vec::new(&env);
    for (i, pct) in [1700u32, 1700, 1700, 1700, 1700, 1500].iter().enumerate() {
        hitos.push_back(MilestoneInput {
            percentage_bps: *pct,
            deadline: if i == 0 { ahora } else { ahora + 1000 * (i as u64 + 1) },
        });
    }

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::FechaPasada)));
}

#[test]
fn rechaza_proyecto_registrado_dos_veces() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let hitos = hitos_validos(&env, env.ledger().timestamp());

    client.register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );

    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert_eq!(resultado, Err(Ok(Error::YaRegistrado)));
}

#[test]
fn rechaza_si_falta_firma_de_la_constructora() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let hitos = hitos_validos(&env, env.ledger().timestamp());
    let args = args_register_project(
        &env, &project_id, &constructora, &interventor, &administrador, &token, &hash, &hitos,
    );

    env.mock_auths(&[
        MockAuth {
            address: &interventor,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
        MockAuth {
            address: &administrador,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
    ]);

    let client = EscrowContractClient::new(&env, &contract_id);
    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert!(resultado.is_err());
}

#[test]
fn rechaza_si_falta_firma_del_interventor() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let hitos = hitos_validos(&env, env.ledger().timestamp());
    let args = args_register_project(
        &env, &project_id, &constructora, &interventor, &administrador, &token, &hash, &hitos,
    );

    env.mock_auths(&[
        MockAuth {
            address: &constructora,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
        MockAuth {
            address: &administrador,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
    ]);

    let client = EscrowContractClient::new(&env, &contract_id);
    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert!(resultado.is_err());
}

#[test]
fn rechaza_si_falta_firma_del_administrador() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let hitos = hitos_validos(&env, env.ledger().timestamp());
    let args = args_register_project(
        &env, &project_id, &constructora, &interventor, &administrador, &token, &hash, &hitos,
    );

    env.mock_auths(&[
        MockAuth {
            address: &constructora,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
        MockAuth {
            address: &interventor,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
    ]);

    let client = EscrowContractClient::new(&env, &contract_id);
    let resultado = client.try_register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );
    assert!(resultado.is_err());
}

// --- Depósitos ---

#[test]
fn deposito_correcto_mueve_tokens_y_actualiza_saldos() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    env.mock_all_auths();
    let (token, token_admin) = crear_token(&env, &administrador);
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[1u8; 16]);
    client.deposit(&project_id, &purchase_id, &500_000);

    assert_eq!(client.get_balance(&project_id), 500_000);
    assert_eq!(client.get_contribution(&project_id, &purchase_id), 500_000);
    assert_eq!(token.balance(&administrador), 10_000_000 - 500_000);
    assert_eq!(token.balance(&contract_id), 500_000);
}

#[test]
fn depositos_repetidos_de_la_misma_compra_se_acumulan() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    env.mock_all_auths();
    let (token, token_admin) = crear_token(&env, &administrador);
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[2u8; 16]);
    client.deposit(&project_id, &purchase_id, &200_000);
    client.deposit(&project_id, &purchase_id, &300_000);

    assert_eq!(client.get_contribution(&project_id, &purchase_id), 500_000);
    assert_eq!(client.get_balance(&project_id), 500_000);
}

#[test]
fn rechaza_monto_cero_o_negativo() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    env.mock_all_auths();
    let (token, token_admin) = crear_token(&env, &administrador);
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[3u8; 16]);
    assert_eq!(
        client.try_deposit(&project_id, &purchase_id, &0i128),
        Err(Ok(Error::MontoInvalido))
    );
    assert_eq!(
        client.try_deposit(&project_id, &purchase_id, &-100i128),
        Err(Ok(Error::MontoInvalido))
    );
}

#[test]
fn rechaza_deposito_sin_firma_del_administrador() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    env.mock_all_auths();
    let (token, token_admin) = crear_token(&env, &administrador);
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    // Quitamos la aprobación general: para `deposit` no queda ninguna firma mockeada.
    env.mock_auths(&[]);
    let purchase_id = BytesN::from_array(&env, &[4u8; 16]);
    let resultado = client.try_deposit(&project_id, &purchase_id, &100_000);
    assert!(resultado.is_err());
}

// --- Reporte de avance ---

#[test]
fn reporte_correcto_pasa_hito_a_reportado_y_guarda_hash() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[5u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    let hito = client.get_milestone(&project_id, &0);
    assert_eq!(hito.status, MilestoneStatus::Reportado);

    let reporte = client.get_report(&project_id, &0);
    assert_eq!(reporte.evidence_hash, evidencia);
    assert_eq!(reporte.photo_count, 3);
}

#[test]
fn rechaza_reporte_sin_firma_de_la_constructora() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    env.mock_auths(&[]);
    let evidencia = BytesN::from_array(&env, &[6u8; 32]);
    let resultado = client.try_report_milestone(&project_id, &0u32, &evidencia, &3u32);
    assert!(resultado.is_err());
}

#[test]
fn rechaza_reporte_con_firma_de_otro_rol() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[7u8; 32]);
    let args: Vec<Val> = (project_id.clone(), 0u32, evidencia.clone(), 3u32).into_val(&env);
    // El interventor firma, pero `report_milestone` solo acepta a la constructora.
    env.mock_auths(&[MockAuth {
        address: &interventor,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "report_milestone",
            args,
            sub_invokes: &[],
        },
    }]);

    let resultado = client.try_report_milestone(&project_id, &0u32, &evidencia, &3u32);
    assert!(resultado.is_err());
}

#[test]
fn rechaza_reportar_hito_pendiente() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[8u8; 32]);
    // El hito 1 nace Pendiente: no se puede reportar sin haber cerrado el 0.
    let resultado = client.try_report_milestone(&project_id, &1u32, &evidencia, &3u32);
    assert_eq!(resultado, Err(Ok(Error::HitoNoEnCurso)));
}

#[test]
fn rechaza_reportar_el_mismo_hito_dos_veces() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[9u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    let resultado = client.try_report_milestone(&project_id, &0u32, &evidencia, &3u32);
    assert_eq!(resultado, Err(Ok(Error::HitoNoEnCurso)));
}

#[test]
fn rechaza_menos_de_3_fotos() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[10u8; 32]);
    let resultado = client.try_report_milestone(&project_id, &0u32, &evidencia, &2u32);
    assert_eq!(resultado, Err(Ok(Error::FotosInsuficientes)));
}

#[test]
fn permite_reportar_despues_de_la_fecha_limite() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let hito = client.get_milestone(&project_id, &0);
    // Avanzamos el reloj más allá de la fecha límite del hito 0.
    env.ledger().set_timestamp(hito.deadline + 10_000);

    let evidencia = BytesN::from_array(&env, &[11u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    let reporte = client.get_report(&project_id, &0);
    assert_eq!(reporte.reported_at, hito.deadline + 10_000);
}

#[test]
fn permite_re_reportar_hito_observado() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia_inicial = BytesN::from_array(&env, &[12u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia_inicial, &3u32);

    // Forzamos el hito a `Observado`, como si el interventor lo hubiera rechazado
    // (esa decisión todavía no tiene su propia función pública en el contrato).
    env.as_contract(&contract_id, || {
        let mut hito: Milestone = env
            .storage()
            .persistent()
            .get(&DataKey::Milestone(project_id.clone(), 0))
            .unwrap();
        hito.status = MilestoneStatus::Observado;
        env.storage()
            .persistent()
            .set(&DataKey::Milestone(project_id.clone(), 0), &hito);
    });

    let evidencia_corregida = BytesN::from_array(&env, &[13u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia_corregida, &4u32);

    let hito = client.get_milestone(&project_id, &0);
    assert_eq!(hito.status, MilestoneStatus::Reportado);
    let reporte = client.get_report(&project_id, &0);
    assert_eq!(reporte.evidence_hash, evidencia_corregida);
}

// --- TTL ---

#[test]
fn los_datos_siguen_disponibles_tras_avanzar_miles_de_ledgers() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let ttl_tras_registrar = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get_ttl(&DataKey::Project(project_id.clone()))
    });
    // `register_project` ya pasó por nuestro `renovar`, que extiende hasta
    // TTL_EXTENDER_LEDGERS; comprobamos que quedó cerca de ese máximo.
    assert!(ttl_tras_registrar >= TTL_EXTENDER_LEDGERS - 1);

    let secuencia_inicial = env.ledger().sequence();
    env.ledger().set_sequence_number(secuencia_inicial + 50_000);

    // Si no hubiéramos extendido el TTL al registrar, leer esto después de avanzar
    // miles de ledgers fallaría porque la entrada habría sido archivada.
    let project = client.get_project(&project_id);
    assert_eq!(project.constructora, constructora);

    let hito = client.get_milestone(&project_id, &0);
    assert_eq!(hito.status, MilestoneStatus::EnCurso);
}

// --- Certificación y liberación ---

#[test]
fn certifica_hito_pagando_todo_y_abre_el_siguiente() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[30u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);

    let evidencia = BytesN::from_array(&env, &[31u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);

    let hito0 = client.get_milestone(&project_id, &0);
    assert_eq!(hito0.status, MilestoneStatus::Desembolsado);

    let hito1 = client.get_milestone(&project_id, &1);
    assert_eq!(hito1.status, MilestoneStatus::EnCurso);

    let certificacion = client.get_certification(&project_id, &0);
    assert_eq!(certificacion.pending, 0);
    assert!(certificacion.paid > 0);

    assert_eq!(client.get_released_total(&project_id), certificacion.paid);
    assert_eq!(token.balance(&constructora), certificacion.paid);
}

#[test]
fn certifica_hito_con_saldo_insuficiente_queda_parcial() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    // El hito 0 vale 170_000 (17% de 1_000_000); depositamos menos.
    let purchase_id = BytesN::from_array(&env, &[32u8; 16]);
    client.deposit(&project_id, &purchase_id, &50_000);

    let evidencia = BytesN::from_array(&env, &[33u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);

    let hito0 = client.get_milestone(&project_id, &0);
    assert_eq!(hito0.status, MilestoneStatus::Certificado);

    // El hito siguiente ya abrió, aunque el pago quedó incompleto.
    let hito1 = client.get_milestone(&project_id, &1);
    assert_eq!(hito1.status, MilestoneStatus::EnCurso);

    let certificacion = client.get_certification(&project_id, &0);
    assert_eq!(certificacion.paid, 50_000);
    assert_eq!(certificacion.pending, 170_000 - 50_000);
    assert_eq!(client.get_balance(&project_id), 0);
}

#[test]
fn rechaza_certificacion_con_hash_distinto() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[34u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    let otro_hash = BytesN::from_array(&env, &[35u8; 32]);
    let resultado = client.try_certify_milestone(&project_id, &0u32, &otro_hash);
    assert_eq!(resultado, Err(Ok(Error::HashNoCoincide)));
}

#[test]
fn rechaza_certificar_hito_que_no_esta_reportado() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[36u8; 32]);
    let resultado = client.try_certify_milestone(&project_id, &0u32, &evidencia);
    assert_eq!(resultado, Err(Ok(Error::HitoNoReportado)));
}

#[test]
fn rechaza_certificar_si_el_proyecto_esta_congelado() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[37u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    // Forzamos el congelamiento (todavía no existe una función pública para esto).
    env.as_contract(&contract_id, || {
        let mut proyecto: Project = env
            .storage()
            .persistent()
            .get(&DataKey::Project(project_id.clone()))
            .unwrap();
        proyecto.congelado = true;
        env.storage()
            .persistent()
            .set(&DataKey::Project(project_id.clone()), &proyecto);
    });

    let resultado = client.try_certify_milestone(&project_id, &0u32, &evidencia);
    assert_eq!(resultado, Err(Ok(Error::ProyectoCongelado)));
}

#[test]
fn rechaza_certificar_si_compliance_es_falso() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[38u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    client.set_compliance(&project_id, &false);
    assert!(!client.get_compliance(&project_id));

    let resultado = client.try_certify_milestone(&project_id, &0u32, &evidencia);
    assert_eq!(resultado, Err(Ok(Error::DocumentosVencidos)));
}

#[test]
fn rechaza_certificar_con_firma_de_otro_rol() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[39u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    let args: Vec<Val> = (project_id.clone(), 0u32, evidencia.clone()).into_val(&env);
    // La constructora firma, pero `certify_milestone` solo acepta al interventor.
    env.mock_auths(&[MockAuth {
        address: &constructora,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "certify_milestone",
            args,
            sub_invokes: &[],
        },
    }]);

    let resultado = client.try_certify_milestone(&project_id, &0u32, &evidencia);
    assert!(resultado.is_err());
}

#[test]
fn certifica_tarde_y_registra_los_segundos_de_atraso() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[40u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);

    let hito0 = client.get_milestone(&project_id, &0);
    let evidencia = BytesN::from_array(&env, &[41u8; 32]);

    // Reportamos y certificamos después de la fecha límite.
    env.ledger().set_timestamp(hito0.deadline + 500);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    env.ledger().set_timestamp(hito0.deadline + 777);
    client.certify_milestone(&project_id, &0u32, &evidencia);

    let certificacion = client.get_certification(&project_id, &0);
    assert!(certificacion.late);
    assert_eq!(certificacion.late_by_seconds, 777);
}

#[test]
fn rechaza_certificar_el_mismo_hito_dos_veces() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[51u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);

    let evidencia = BytesN::from_array(&env, &[52u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);

    let resultado = client.try_certify_milestone(&project_id, &0u32, &evidencia);
    assert_eq!(resultado, Err(Ok(Error::HitoNoReportado)));
}

#[test]
fn certificar_el_ultimo_hito_no_abre_ninguno_siguiente() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[50u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);

    // Certificamos del 0 al 4 para dejar el 5 (el último de 6) como el que abre.
    for i in 0u32..5 {
        let evidencia = BytesN::from_array(&env, &[(60 + i) as u8; 32]);
        client.report_milestone(&project_id, &i, &evidencia, &3u32);
        client.certify_milestone(&project_id, &i, &evidencia);
    }

    let evidencia_final = BytesN::from_array(&env, &[70u8; 32]);
    client.report_milestone(&project_id, &5u32, &evidencia_final, &3u32);
    client.certify_milestone(&project_id, &5u32, &evidencia_final);

    let hito5 = client.get_milestone(&project_id, &5);
    assert_eq!(hito5.status, MilestoneStatus::Desembolsado);

    // No hay hito 6: la consulta debe fallar con HitoNoExiste, no haber creado nada.
    let resultado = client.try_get_milestone(&project_id, &6u32);
    assert_eq!(resultado, Err(Ok(Error::HitoNoExiste)));
}

#[test]
fn rechaza_certificacion_por_desbordamiento_aritmetico() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    env.mock_all_auths();
    let client = EscrowContractClient::new(&env, &contract_id);
    let hitos = hitos_validos(&env, env.ledger().timestamp());
    client.register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &i128::MAX,
        &hash,
        &hitos,
    );

    let evidencia = BytesN::from_array(&env, &[20u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    let resultado = client.try_certify_milestone(&project_id, &0u32, &evidencia);
    assert_eq!(resultado, Err(Ok(Error::DesbordamientoAritmetico)));
}

#[test]
fn la_suma_de_los_montos_de_todos_los_hitos_es_el_presupuesto_exacto() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &PRESUPUESTO);

    let client = EscrowContractClient::new(&env, &contract_id);
    let hitos = hitos_no_exactos(&env, env.ledger().timestamp());
    client.register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );

    let purchase_id = BytesN::from_array(&env, &[53u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);

    for i in 0u32..7 {
        let evidencia = BytesN::from_array(&env, &[(80 + i) as u8; 32]);
        client.report_milestone(&project_id, &i, &evidencia, &3u32);
        client.certify_milestone(&project_id, &i, &evidencia);
    }

    assert_eq!(client.get_released_total(&project_id), PRESUPUESTO);
    assert_eq!(client.get_balance(&project_id), 0);
    for i in 0u32..7 {
        let hito = client.get_milestone(&project_id, &i);
        assert_eq!(hito.status, MilestoneStatus::Desembolsado);
    }
}

// --- Observación ---

#[test]
fn observa_hito_reportado_y_lo_deja_corregible() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[42u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    let motivo = BytesN::from_array(&env, &[43u8; 32]);
    client.observe_milestone(&project_id, &0u32, &motivo);

    let hito0 = client.get_milestone(&project_id, &0);
    assert_eq!(hito0.status, MilestoneStatus::Observado);
}

#[test]
fn rechaza_observar_hito_que_no_esta_reportado() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let motivo = BytesN::from_array(&env, &[44u8; 32]);
    let resultado = client.try_observe_milestone(&project_id, &0u32, &motivo);
    assert_eq!(resultado, Err(Ok(Error::HitoNoReportado)));
}

#[test]
fn rechaza_observar_sin_firma_del_interventor() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let evidencia = BytesN::from_array(&env, &[45u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);

    env.mock_auths(&[]);
    let motivo = BytesN::from_array(&env, &[46u8; 32]);
    let resultado = client.try_observe_milestone(&project_id, &0u32, &motivo);
    assert!(resultado.is_err());
}

// --- Cobro de pendiente (claim_pending) ---

#[test]
fn claim_pending_cobra_el_resto_tras_un_nuevo_deposito() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    // Depositamos menos de lo que vale el hito 0 (170_000) y certificamos: queda parcial.
    let purchase_id = BytesN::from_array(&env, &[54u8; 16]);
    client.deposit(&project_id, &purchase_id, &100_000);

    let evidencia = BytesN::from_array(&env, &[55u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);

    let hito0 = client.get_milestone(&project_id, &0);
    assert_eq!(hito0.status, MilestoneStatus::Certificado);
    let certificacion = client.get_certification(&project_id, &0);
    assert_eq!(certificacion.paid, 100_000);
    assert_eq!(certificacion.pending, 70_000);

    // Llega el resto del dinero.
    client.deposit(&project_id, &purchase_id, &70_000);
    client.claim_pending(&project_id, &0u32);

    let hito0_final = client.get_milestone(&project_id, &0);
    assert_eq!(hito0_final.status, MilestoneStatus::Desembolsado);

    let certificacion_final = client.get_certification(&project_id, &0);
    assert_eq!(certificacion_final.pending, 0);
    assert_eq!(certificacion_final.paid, 170_000);

    assert_eq!(client.get_released_total(&project_id), 170_000);
    assert_eq!(token.balance(&constructora), 170_000);
}

#[test]
fn rechaza_claim_pending_sin_firma_de_la_constructora() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[56u8; 16]);
    client.deposit(&project_id, &purchase_id, &100_000);
    let evidencia = BytesN::from_array(&env, &[57u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);
    client.deposit(&project_id, &purchase_id, &70_000);

    env.mock_auths(&[]);
    let resultado = client.try_claim_pending(&project_id, &0u32);
    assert!(resultado.is_err());
}

#[test]
fn rechaza_claim_pending_con_firma_de_otro_rol() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[58u8; 16]);
    client.deposit(&project_id, &purchase_id, &100_000);
    let evidencia = BytesN::from_array(&env, &[59u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);
    client.deposit(&project_id, &purchase_id, &70_000);

    let args: Vec<Val> = (project_id.clone(), 0u32).into_val(&env);
    // El interventor firma, pero `claim_pending` solo acepta a la constructora.
    env.mock_auths(&[MockAuth {
        address: &interventor,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "claim_pending",
            args,
            sub_invokes: &[],
        },
    }]);

    let resultado = client.try_claim_pending(&project_id, &0u32);
    assert!(resultado.is_err());
}

#[test]
fn rechaza_claim_pending_si_el_proyecto_esta_congelado() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[60u8; 16]);
    client.deposit(&project_id, &purchase_id, &100_000);
    let evidencia = BytesN::from_array(&env, &[61u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);
    client.deposit(&project_id, &purchase_id, &70_000);

    env.as_contract(&contract_id, || {
        let mut proyecto: Project = env
            .storage()
            .persistent()
            .get(&DataKey::Project(project_id.clone()))
            .unwrap();
        proyecto.congelado = true;
        env.storage()
            .persistent()
            .set(&DataKey::Project(project_id.clone()), &proyecto);
    });

    let resultado = client.try_claim_pending(&project_id, &0u32);
    assert_eq!(resultado, Err(Ok(Error::ProyectoCongelado)));
}

#[test]
fn rechaza_claim_pending_si_compliance_es_falso() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[62u8; 16]);
    client.deposit(&project_id, &purchase_id, &100_000);
    let evidencia = BytesN::from_array(&env, &[63u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);
    client.deposit(&project_id, &purchase_id, &70_000);

    client.set_compliance(&project_id, &false);

    let resultado = client.try_claim_pending(&project_id, &0u32);
    assert_eq!(resultado, Err(Ok(Error::DocumentosVencidos)));
}

// --- check_overdue ---

#[test]
fn marca_hito_abierto_vencido() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let hito0 = client.get_milestone(&project_id, &0);
    env.ledger().set_timestamp(hito0.deadline + 50);

    client.check_overdue(&project_id, &0u32);

    let vencimiento = client.get_overdue(&project_id, &0);
    assert_eq!(vencimiento.late_by_seconds, 50);
}

#[test]
fn rechaza_check_overdue_antes_de_la_fecha_limite() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let resultado = client.try_check_overdue(&project_id, &0u32);
    assert_eq!(resultado, Err(Ok(Error::AunNoVence)));
}

#[test]
fn rechaza_check_overdue_si_ya_fue_marcado() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let hito0 = client.get_milestone(&project_id, &0);
    env.ledger().set_timestamp(hito0.deadline + 50);
    client.check_overdue(&project_id, &0u32);

    let resultado = client.try_check_overdue(&project_id, &0u32);
    assert_eq!(resultado, Err(Ok(Error::YaMarcadoVencido)));
}

#[test]
fn rechaza_check_overdue_en_hito_pendiente() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    // El hito 1 nace Pendiente.
    let resultado = client.try_check_overdue(&project_id, &1u32);
    assert_eq!(resultado, Err(Ok(Error::HitoNoVencible)));
}

#[test]
fn rechaza_check_overdue_en_hito_desembolsado() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[90u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);
    let evidencia = BytesN::from_array(&env, &[91u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);

    let resultado = client.try_check_overdue(&project_id, &0u32);
    assert_eq!(resultado, Err(Ok(Error::HitoNoVencible)));
}

#[test]
fn check_overdue_funciona_sin_ninguna_firma() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let hitos = hitos_validos(&env, env.ledger().timestamp());
    let args = args_register_project(
        &env, &project_id, &constructora, &interventor, &administrador, &token, &hash, &hitos,
    );
    // Aprobación única para el registro: ninguna otra firma queda activa después.
    env.mock_auths(&[
        MockAuth {
            address: &constructora,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
        MockAuth {
            address: &interventor,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
        MockAuth {
            address: &administrador,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "register_project",
                args: args.clone(),
                sub_invokes: &[],
            },
        },
    ]);

    let client = EscrowContractClient::new(&env, &contract_id);
    client.register_project(
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token,
        &PRESUPUESTO,
        &hash,
        &hitos,
    );

    let hito0 = client.get_milestone(&project_id, &0);
    env.ledger().set_timestamp(hito0.deadline + 123);

    // Sin mock_all_auths ni mock_auths activos: cero firmas disponibles, y
    // check_overdue funciona igual porque no exige ninguna.
    client.check_overdue(&project_id, &0u32);

    let vencimiento = client.get_overdue(&project_id, &0);
    assert_eq!(vencimiento.late_by_seconds, 123);
}

// --- freeze / unfreeze ---

#[test]
fn rechaza_freeze_sin_firma_del_administrador() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    env.mock_auths(&[]);
    let motivo = BytesN::from_array(&env, &[92u8; 32]);
    let resultado = client.try_freeze(&project_id, &motivo);
    assert!(resultado.is_err());
}

#[test]
fn rechaza_freeze_con_firma_de_otro_rol() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let motivo = BytesN::from_array(&env, &[93u8; 32]);
    let args: Vec<Val> = (project_id.clone(), motivo.clone()).into_val(&env);
    // La constructora firma, pero `freeze` solo acepta al administrador.
    env.mock_auths(&[MockAuth {
        address: &constructora,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "freeze",
            args,
            sub_invokes: &[],
        },
    }]);

    let resultado = client.try_freeze(&project_id, &motivo);
    assert!(resultado.is_err());
}

#[test]
fn rechaza_doble_congelamiento() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let motivo = BytesN::from_array(&env, &[94u8; 32]);
    client.freeze(&project_id, &motivo);

    let resultado = client.try_freeze(&project_id, &motivo);
    assert_eq!(resultado, Err(Ok(Error::YaCongelado)));
}

#[test]
fn rechaza_descongelar_si_no_esta_congelado() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let resultado = client.try_unfreeze(&project_id);
    assert_eq!(resultado, Err(Ok(Error::NoCongelado)));
}

#[test]
fn congelado_bloquea_certificar_y_cobrar_pendiente_pero_permite_deposito_reporte_y_observacion() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    // Certificación parcial ANTES de congelar, para tener un pendiente que cobrar.
    let purchase_id = BytesN::from_array(&env, &[98u8; 16]);
    client.deposit(&project_id, &purchase_id, &50_000);
    let evidencia = BytesN::from_array(&env, &[99u8; 32]);
    client.report_milestone(&project_id, &0u32, &evidencia, &3u32);
    client.certify_milestone(&project_id, &0u32, &evidencia);
    client.deposit(&project_id, &purchase_id, &120_000); // llega el resto, pero aún no se cobra

    let motivo = BytesN::from_array(&env, &[100u8; 32]);
    client.freeze(&project_id, &motivo);

    // Sigue permitido estando congelado:
    client.deposit(&project_id, &purchase_id, &1_000);
    client.report_milestone(&project_id, &1u32, &evidencia, &3u32); // hito 1 ya está EnCurso
    client.observe_milestone(&project_id, &1u32, &motivo);

    // Bloqueado estando congelado:
    assert_eq!(
        client.try_certify_milestone(&project_id, &0u32, &evidencia),
        Err(Ok(Error::ProyectoCongelado))
    );
    assert_eq!(
        client.try_claim_pending(&project_id, &0u32),
        Err(Ok(Error::ProyectoCongelado))
    );

    client.unfreeze(&project_id);

    // Vuelve a funcionar tras descongelar:
    client.claim_pending(&project_id, &0u32);
    let hito0 = client.get_milestone(&project_id, &0);
    assert_eq!(hito0.status, MilestoneStatus::Desembolsado);
}

#[test]
fn get_freeze_muestra_unfrozen_at_tras_descongelar() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let motivo = BytesN::from_array(&env, &[101u8; 32]);
    client.freeze(&project_id, &motivo);

    let congelamiento = client.get_freeze(&project_id);
    assert_eq!(congelamiento.unfrozen_at, None);
    assert_eq!(congelamiento.reason_hash, motivo);

    let momento_descongelar = env.ledger().timestamp() + 500;
    env.ledger().set_timestamp(momento_descongelar);
    client.unfreeze(&project_id);

    let congelamiento_final = client.get_freeze(&project_id);
    assert_eq!(congelamiento_final.unfrozen_at, Some(momento_descongelar));
    assert_eq!(congelamiento_final.reason_hash, motivo);
}

// --- Cambio de cronograma ---

#[test]
fn cambio_de_cronograma_camino_feliz_hash_y_fechas_cambian_y_montos_siguen_exactos() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1800,
        new_deadline: 1_004_500,
    });
    items.push_back(ScheduleChangeItem {
        index: 4,
        new_bps: 1600,
        new_deadline: 1_005_500,
    });

    let motivo = BytesN::from_array(&env, &[102u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[103u8; 32]);
    client.request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    client.resolve_schedule_change(&project_id, &true, &motivo);

    let proyecto = client.get_project(&project_id);
    assert_eq!(proyecto.hash_cronograma, nuevo_hash);

    let hito3 = client.get_milestone(&project_id, &3);
    assert_eq!(hito3.percentage_bps, 1800);
    assert_eq!(hito3.deadline, 1_004_500);
    let hito4 = client.get_milestone(&project_id, &4);
    assert_eq!(hito4.percentage_bps, 1600);
    assert_eq!(hito4.deadline, 1_005_500);

    // No queda ninguna solicitud pendiente.
    let resultado = client.try_get_schedule_request(&project_id);
    assert_eq!(resultado, Err(Ok(Error::SolicitudNoExiste)));

    // Certificamos todo el cronograma modificado: la suma de los montos sigue
    // siendo exactamente el presupuesto.
    let purchase_id = BytesN::from_array(&env, &[104u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);
    for i in 0u32..6 {
        let evidencia = BytesN::from_array(&env, &[(110 + i) as u8; 32]);
        client.report_milestone(&project_id, &i, &evidencia, &3u32);
        client.certify_milestone(&project_id, &i, &evidencia);
    }
    assert_eq!(client.get_released_total(&project_id), PRESUPUESTO);
}

#[test]
fn rechaza_solicitud_si_el_hito_no_esta_pendiente() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    // El hito 0 nace EnCurso, nunca Pendiente.
    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 0,
        new_bps: 1700,
        new_deadline: 1_001_500,
    });

    let motivo = BytesN::from_array(&env, &[105u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[106u8; 32]);
    let resultado = client.try_request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    assert_eq!(resultado, Err(Ok(Error::HitoNoModificable)));
}

#[test]
fn rechaza_solicitud_si_el_total_no_se_conserva() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1800,
        new_deadline: 1_004_500,
    });
    items.push_back(ScheduleChangeItem {
        index: 4,
        new_bps: 1700, // 1800+1700=3500 != 1700+1700=3400 original
        new_deadline: 1_005_500,
    });

    let motivo = BytesN::from_array(&env, &[107u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[108u8; 32]);
    let resultado = client.try_request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    assert_eq!(resultado, Err(Ok(Error::TotalNoConservado)));
}

#[test]
fn rechaza_solicitud_si_supera_el_tope() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    // Tope para 6 hitos = max(1500, 20000/6) = 3333 bps.
    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 3400,
        new_deadline: 1_004_500,
    });
    items.push_back(ScheduleChangeItem {
        index: 4,
        new_bps: 0,
        new_deadline: 1_005_500,
    });

    let motivo = BytesN::from_array(&env, &[109u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[111u8; 32]);
    let resultado = client.try_request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    assert_eq!(resultado, Err(Ok(Error::HitoExcedeTope)));
}

#[test]
fn rechaza_solicitud_si_las_fechas_quedan_desordenadas() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    // Dejamos la nueva fecha del hito 3 por delante de la del hito 4 (sin tocar, 1_005_000).
    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1700,
        new_deadline: 1_005_500,
    });

    let motivo = BytesN::from_array(&env, &[112u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[113u8; 32]);
    let resultado = client.try_request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    assert_eq!(resultado, Err(Ok(Error::FechasNoCrecientes)));
}

#[test]
fn rechaza_segunda_solicitud_mientras_hay_una_pendiente() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1700,
        new_deadline: 1_004_500,
    });
    let motivo = BytesN::from_array(&env, &[114u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[115u8; 32]);
    client.request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);

    let resultado = client.try_request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    assert_eq!(resultado, Err(Ok(Error::SolicitudPendiente)));
}

#[test]
fn rechaza_solicitud_con_firma_de_otro_rol() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1700,
        new_deadline: 1_004_500,
    });
    let motivo = BytesN::from_array(&env, &[116u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[117u8; 32]);

    let args: Vec<Val> =
        (project_id.clone(), items.clone(), motivo.clone(), nuevo_hash.clone()).into_val(&env);
    // El interventor firma, pero `request_schedule_change` solo acepta a la constructora.
    env.mock_auths(&[MockAuth {
        address: &interventor,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "request_schedule_change",
            args,
            sub_invokes: &[],
        },
    }]);

    let resultado = client.try_request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    assert!(resultado.is_err());
}

#[test]
fn rechaza_solicitud_si_la_nueva_fecha_ya_paso() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let ahora = env.ledger().timestamp();
    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1700,
        new_deadline: ahora,
    });

    let motivo = BytesN::from_array(&env, &[118u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[119u8; 32]);
    let resultado = client.try_request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);
    assert_eq!(resultado, Err(Ok(Error::FechaPasada)));
}

#[test]
fn resolve_schedule_change_rechazo_no_cambia_nada() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1800,
        new_deadline: 1_004_500,
    });
    items.push_back(ScheduleChangeItem {
        index: 4,
        new_bps: 1600,
        new_deadline: 1_005_500,
    });
    let motivo = BytesN::from_array(&env, &[120u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[121u8; 32]);
    client.request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);

    let nota = BytesN::from_array(&env, &[122u8; 32]);
    client.resolve_schedule_change(&project_id, &false, &nota);

    let proyecto = client.get_project(&project_id);
    assert_eq!(proyecto.hash_cronograma, hash); // sigue el original

    let hito3 = client.get_milestone(&project_id, &3);
    assert_eq!(hito3.percentage_bps, 1700); // sin cambios

    let resultado = client.try_get_schedule_request(&project_id);
    assert_eq!(resultado, Err(Ok(Error::SolicitudNoExiste))); // quedó cerrada
}

#[test]
fn resolve_schedule_change_sin_solicitud_da_error() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let nota = BytesN::from_array(&env, &[123u8; 32]);
    let resultado = client.try_resolve_schedule_change(&project_id, &true, &nota);
    assert_eq!(resultado, Err(Ok(Error::SinSolicitud)));
}

#[test]
fn resolve_schedule_change_con_firma_de_otro_rol_falla() {
    let (env, contract_id, constructora, interventor, administrador, token, project_id, hash) =
        setup();
    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env, &client, &project_id, &constructora, &interventor, &administrador, &token, &hash,
    );

    let mut items = Vec::new(&env);
    items.push_back(ScheduleChangeItem {
        index: 3,
        new_bps: 1700,
        new_deadline: 1_004_500,
    });
    let motivo = BytesN::from_array(&env, &[124u8; 32]);
    let nuevo_hash = BytesN::from_array(&env, &[125u8; 32]);
    client.request_schedule_change(&project_id, &items, &motivo, &nuevo_hash);

    let nota = BytesN::from_array(&env, &[126u8; 32]);
    let args: Vec<Val> = (project_id.clone(), true, nota.clone()).into_val(&env);
    // La constructora firma, pero `resolve_schedule_change` solo acepta al interventor.
    env.mock_auths(&[MockAuth {
        address: &constructora,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "resolve_schedule_change",
            args,
            sub_invokes: &[],
        },
    }]);

    let resultado = client.try_resolve_schedule_change(&project_id, &true, &nota);
    assert!(resultado.is_err());
}

// --- Cierre del proyecto, de punta a punta ---

#[test]
fn flujo_completo_certifica_todo_y_cierra_el_proyecto() {
    let (env, contract_id, constructora, interventor, administrador, _placeholder, project_id, hash) =
        setup();
    let (token, token_admin) = crear_token(&env, &administrador);
    env.mock_all_auths();
    token_admin.mint(&administrador, &10_000_000);

    let client = EscrowContractClient::new(&env, &contract_id);
    registrar_proyecto(
        &env,
        &client,
        &project_id,
        &constructora,
        &interventor,
        &administrador,
        &token.address,
        &hash,
    );

    let purchase_id = BytesN::from_array(&env, &[127u8; 16]);
    client.deposit(&project_id, &purchase_id, &PRESUPUESTO);

    for i in 0u32..6 {
        let evidencia = BytesN::from_array(&env, &[(130 + i) as u8; 32]);
        client.report_milestone(&project_id, &i, &evidencia, &3u32);
        client.certify_milestone(&project_id, &i, &evidencia);
    }

    assert_eq!(token.balance(&constructora), PRESUPUESTO);
    assert_eq!(client.get_balance(&project_id), 0);

    let proyecto = client.get_project(&project_id);
    assert!(!proyecto.activo);
}
