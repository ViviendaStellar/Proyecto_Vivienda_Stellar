#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN,
    Env, IntoVal, TryFromVal, Val, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MilestoneStatus {
    Pendiente,
    EnCurso,
    Reportado,
    Certificado,
    Desembolsado,
    Observado,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Project {
    pub id: BytesN<16>,
    pub constructora: Address,
    pub interventor: Address,
    pub administrador: Address,
    pub token: Address,
    pub presupuesto_total: i128,
    pub hash_cronograma: BytesN<32>,
    pub activo: bool,
    pub congelado: bool,
    /// Cuántos hitos tiene el cronograma. Se fija al registrar y no cambia
    /// después; con esto sabemos cuál es "el último hito" y qué tope aplica a
    /// un cambio de cronograma sin tener que adivinarlo.
    pub milestone_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub index: u32,
    pub percentage_bps: u32,
    pub deadline: u64,
    pub status: MilestoneStatus,
    /// Porcentaje acumulado (base 10000) desde el hito 0 hasta este, inclusive.
    /// Con esto `monto_hito` no necesita volver a sumar los hitos anteriores.
    pub cumulative_bps: u32,
}

/// Lo que recibe `register_project` por cada hito: porcentaje (base 10000) y fecha límite.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneInput {
    pub percentage_bps: u32,
    pub deadline: u64,
}

/// Lo que registra `report_milestone`: la huella de la evidencia, cuántas fotos y cuándo.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Report {
    pub evidence_hash: BytesN<32>,
    pub photo_count: u32,
    pub reported_at: u64,
}

/// Lo que registra `certify_milestone`: cuándo se certificó, si fue tarde y cuánto
/// de su monto se pagó de una vez (el resto queda `pending` hasta que haya saldo).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certification {
    pub certified_at: u64,
    pub late: bool,
    pub late_by_seconds: u64,
    pub paid: i128,
    pub pending: i128,
}

/// Lo que guarda `check_overdue`: cuándo se marcó el atraso y cuántos segundos
/// de atraso tenía el hito en ese momento.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Overdue {
    pub marked_at: u64,
    pub late_by_seconds: u64,
}

/// Historial del congelamiento del proyecto. `unfrozen_at` queda vacío
/// mientras el proyecto sigue congelado; `unfreeze` lo rellena.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Freeze {
    pub frozen_at: u64,
    pub reason_hash: BytesN<32>,
    pub unfrozen_at: Option<u64>,
}

/// Un cambio propuesto para un hito puntual dentro de `request_schedule_change`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ScheduleChangeItem {
    pub index: u32,
    pub new_bps: u32,
    pub new_deadline: u64,
}

/// La solicitud de cambio de cronograma pendiente de un proyecto. Solo puede
/// existir una a la vez; `resolve_schedule_change` siempre la borra al cerrar.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ScheduleChangeRequest {
    pub items: Vec<ScheduleChangeItem>,
    pub reason_hash: BytesN<32>,
    pub new_schedule_hash: BytesN<32>,
    pub requested_at: u64,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Project(BytesN<16>),
    Milestone(BytesN<16>, u32),
    EscrowBalance(BytesN<16>),
    Contribution(BytesN<16>, BytesN<16>),
    Report(BytesN<16>, u32),
    Compliance(BytesN<16>),
    Certification(BytesN<16>, u32),
    ReleasedTotal(BytesN<16>),
    Overdue(BytesN<16>, u32),
    Freeze(BytesN<16>),
    ScheduleRequest(BytesN<16>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    YaRegistrado = 1,
    PresupuestoInvalido = 2,
    CantidadHitosInvalida = 3,
    HitoExcedeTope = 4,
    FechaPasada = 5,
    FechasNoCrecientes = 6,
    SumaPorcentajesInvalida = 7,
    ProyectoNoExiste = 8,
    HitoNoExiste = 9,
    MontoInvalido = 10,
    HitoNoEnCurso = 11,
    FotosInsuficientes = 12,
    EvidenciaVacia = 13,
    ReporteNoExiste = 14,
    DocumentosVencidos = 15,
    ProyectoCongelado = 16,
    HitoNoReportado = 17,
    HashNoCoincide = 18,
    HitoSinPendiente = 19,
    DesbordamientoAritmetico = 20,
    CertificacionNoExiste = 21,
    HitoNoVencible = 22,
    AunNoVence = 23,
    YaMarcadoVencido = 24,
    YaCongelado = 25,
    NoCongelado = 26,
    SolicitudPendiente = 27,
    HitoNoModificable = 28,
    IndiceRepetido = 29,
    TotalNoConservado = 30,
    SinSolicitud = 31,
    VencimientoNoExiste = 32,
    FreezeNoExiste = 33,
    SolicitudNoExiste = 34,
}

/// Evento emitido cada vez que la constructora reporta el avance de un hito.
#[contractevent]
pub struct MilestoneReported {
    #[topic]
    pub project_id: BytesN<16>,
    #[topic]
    pub index: u32,
    pub evidence_hash: BytesN<32>,
}

/// Evento emitido cuando el interventor certifica un hito.
#[contractevent]
pub struct MilestoneCertified {
    #[topic]
    pub project_id: BytesN<16>,
    #[topic]
    pub index: u32,
    pub late: bool,
    pub late_by_seconds: u64,
}

/// Evento emitido cada vez que se paga dinero a la constructora (certificación
/// completa, parcial, o un `claim_pending` posterior).
#[contractevent]
pub struct Disbursed {
    #[topic]
    pub project_id: BytesN<16>,
    #[topic]
    pub index: u32,
    pub paid: i128,
    pub pending: i128,
}

/// Evento emitido cuando el interventor observa (rechaza) un hito reportado.
#[contractevent]
pub struct MilestoneObserved {
    #[topic]
    pub project_id: BytesN<16>,
    #[topic]
    pub index: u32,
    pub reason_hash: BytesN<32>,
}

/// Evento emitido por `check_overdue` cuando marca un hito vencido.
#[contractevent]
pub struct MilestoneOverdue {
    #[topic]
    pub project_id: BytesN<16>,
    #[topic]
    pub index: u32,
    pub late_by_seconds: u64,
}

/// Evento emitido al congelar un proyecto.
#[contractevent]
pub struct ProjectFrozen {
    #[topic]
    pub project_id: BytesN<16>,
    pub reason_hash: BytesN<32>,
}

/// Evento emitido al descongelar un proyecto.
#[contractevent]
pub struct ProjectUnfrozen {
    #[topic]
    pub project_id: BytesN<16>,
}

/// Evento emitido cuando la constructora pide un cambio de cronograma.
#[contractevent]
pub struct ScheduleChangeRequested {
    #[topic]
    pub project_id: BytesN<16>,
    pub reason_hash: BytesN<32>,
}

/// Evento emitido cuando el interventor aprueba un cambio de cronograma.
#[contractevent]
pub struct ScheduleChanged {
    #[topic]
    pub project_id: BytesN<16>,
    pub new_schedule_hash: BytesN<32>,
}

/// Evento emitido cuando el interventor rechaza un cambio de cronograma.
#[contractevent]
pub struct ScheduleChangeRejected {
    #[topic]
    pub project_id: BytesN<16>,
    pub note_hash: BytesN<32>,
}

/// Evento emitido cuando el último hito queda `Desembolsado` y el proyecto
/// se cierra.
#[contractevent]
pub struct ProjectFinished {
    #[topic]
    pub project_id: BytesN<16>,
}

const MIN_HITOS: u32 = 6;
const MAX_HITOS: u32 = 60;
const SUMA_PORCENTAJES: u32 = 10000;
const TOPE_MINIMO_BPS: u32 = 1500;
const TOPE_BASE_BPS: u32 = 20000;
const MIN_FOTOS: u32 = 3;

// --- TTL: cuánto tiempo guardamos los datos antes de que la red los archive ---
// Un ledger tarda ~5 segundos en cerrarse; este es el tamaño de "un día" medido en
// ledgers, la unidad en la que Soroban mide el TTL (tiempo de vida) de cada entrada.
const DIA_EN_LEDGERS: u32 = 17280;

// Umbral de renovación: en cuanto a una entrada le queden menos de 30 días de vida,
// la renovamos. Un proyecto de vivienda dura meses, así que ese margen evita que una
// entrada se archive justo entre dos operaciones normales del mismo proyecto.
const TTL_UMBRAL_LEDGERS: u32 = 30 * DIA_EN_LEDGERS;

// Hasta dónde extendemos cada vez: 120 días. Confirmamos en testnet (protocolo 29,
// `stellar network settings`) que el techo real de la red es 180 días
// (`max_entry_ttl` = 3.110.400 ledgers); dejamos margen por debajo de ese techo en
// vez de pedir siempre el máximo permitido.
const TTL_EXTENDER_LEDGERS: u32 = 120 * DIA_EN_LEDGERS;

/// Extiende el TTL de una entrada que ya existe en `persistent()`. Si a la entrada
/// todavía le queda más vida que `TTL_UMBRAL_LEDGERS`, no hace nada (es barato llamarla
/// siempre, no solo cuando haga falta).
fn renovar(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_UMBRAL_LEDGERS, TTL_EXTENDER_LEDGERS);
}

/// Lee una entrada de `persistent()` y, si existía, le renueva el TTL de una vez.
fn leer<V>(env: &Env, key: &DataKey) -> Option<V>
where
    V: TryFromVal<Env, Val>,
{
    let valor: Option<V> = env.storage().persistent().get(key);
    if valor.is_some() {
        renovar(env, key);
    }
    valor
}

/// Guarda una entrada en `persistent()` y le renueva el TTL en el mismo paso.
fn guardar<V>(env: &Env, key: &DataKey, valor: &V)
where
    V: IntoVal<Env, Val>,
{
    env.storage().persistent().set(key, valor);
    renovar(env, key);
}

/// Cuánto le corresponde a un hito del presupuesto total, sin perder centavos:
/// `monto(i) = presupuesto*acumulado_hasta_i/10000 - presupuesto*acumulado_antes_de_i/10000`.
/// Como la resta es telescópica, la suma de `monto(i)` de todos los hitos es
/// exactamente `presupuesto_total`, caiga donde caiga cada redondeo hacia abajo.
/// Usa aritmética verificada: cualquier desbordamiento devuelve un error en vez
/// de envolver silenciosamente.
fn monto_hito(presupuesto_total: i128, milestone: &Milestone) -> Result<i128, Error> {
    let acumulado_hasta = milestone.cumulative_bps as i128;
    let acumulado_antes = acumulado_hasta - milestone.percentage_bps as i128;
    let base = SUMA_PORCENTAJES as i128;

    let total_hasta = presupuesto_total
        .checked_mul(acumulado_hasta)
        .ok_or(Error::DesbordamientoAritmetico)?
        .checked_div(base)
        .ok_or(Error::DesbordamientoAritmetico)?;
    let total_antes = presupuesto_total
        .checked_mul(acumulado_antes)
        .ok_or(Error::DesbordamientoAritmetico)?
        .checked_div(base)
        .ok_or(Error::DesbordamientoAritmetico)?;

    total_hasta
        .checked_sub(total_antes)
        .ok_or(Error::DesbordamientoAritmetico)
}

/// Si el hito que se acaba de desembolsar era el último del cronograma, cierra
/// el proyecto (`activo = false`) y emite `ProjectFinished`. No hace nada si
/// quedan hitos después de este.
fn cerrar_si_ultimo_hito(env: &Env, project_id: &BytesN<16>, index: u32, project: &Project) {
    if index + 1 == project.milestone_count {
        let mut actualizado = project.clone();
        actualizado.activo = false;
        guardar(env, &DataKey::Project(project_id.clone()), &actualizado);
        ProjectFinished {
            project_id: project_id.clone(),
        }
        .publish(env);
    }
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Registra un proyecto con su cronograma de hitos. Exige la firma de la
    /// constructora, el interventor y el administrador. El cronograma queda
    /// bloqueado desde este momento: no se puede volver a registrar el mismo
    /// `project_id`.
    pub fn register_project(
        env: Env,
        project_id: BytesN<16>,
        constructora: Address,
        interventor: Address,
        administrador: Address,
        token: Address,
        presupuesto_total: i128,
        hash_cronograma: BytesN<32>,
        hitos: Vec<MilestoneInput>,
    ) -> Result<(), Error> {
        constructora.require_auth();
        interventor.require_auth();
        administrador.require_auth();

        let project_key = DataKey::Project(project_id.clone());
        if env.storage().persistent().has(&project_key) {
            return Err(Error::YaRegistrado);
        }

        if presupuesto_total <= 0 {
            return Err(Error::PresupuestoInvalido);
        }

        let cantidad = hitos.len();
        if cantidad < MIN_HITOS || cantidad > MAX_HITOS {
            return Err(Error::CantidadHitosInvalida);
        }

        let tope_bps = core::cmp::max(TOPE_MINIMO_BPS, TOPE_BASE_BPS / cantidad);
        let ahora = env.ledger().timestamp();

        let mut suma_bps: u32 = 0;
        let mut fecha_anterior: u64 = 0;
        for (i, hito) in hitos.iter().enumerate() {
            if hito.percentage_bps > tope_bps {
                return Err(Error::HitoExcedeTope);
            }
            if i == 0 {
                if hito.deadline <= ahora {
                    return Err(Error::FechaPasada);
                }
            } else if hito.deadline <= fecha_anterior {
                return Err(Error::FechasNoCrecientes);
            }
            fecha_anterior = hito.deadline;
            suma_bps += hito.percentage_bps;
        }

        if suma_bps != SUMA_PORCENTAJES {
            return Err(Error::SumaPorcentajesInvalida);
        }

        let project = Project {
            id: project_id.clone(),
            constructora,
            interventor,
            administrador,
            token,
            presupuesto_total,
            hash_cronograma,
            activo: true,
            congelado: false,
            milestone_count: cantidad,
        };
        guardar(&env, &project_key, &project);
        guardar(&env, &DataKey::Compliance(project_id.clone()), &true);

        let mut acumulado: u32 = 0;
        for (i, hito) in hitos.iter().enumerate() {
            let index = i as u32;
            let status = if index == 0 {
                MilestoneStatus::EnCurso
            } else {
                MilestoneStatus::Pendiente
            };
            acumulado += hito.percentage_bps;
            let milestone = Milestone {
                index,
                percentage_bps: hito.percentage_bps,
                deadline: hito.deadline,
                status,
                cumulative_bps: acumulado,
            };
            guardar(&env, &DataKey::Milestone(project_id.clone(), index), &milestone);
        }

        Ok(())
    }

    /// Guarda si la constructora tiene sus documentos legales vigentes. Exige la
    /// firma del administrador. Al registrar el proyecto el valor inicial es
    /// `true`; el administrador lo pasa a `false` cuando detecta un documento
    /// vencido, y eso basta para bloquear nuevas certificaciones y liberaciones.
    pub fn set_compliance(env: Env, project_id: BytesN<16>, ok: bool) -> Result<(), Error> {
        let project: Project =
            leer(&env, &DataKey::Project(project_id.clone())).ok_or(Error::ProyectoNoExiste)?;
        project.administrador.require_auth();

        guardar(&env, &DataKey::Compliance(project_id), &ok);
        Ok(())
    }

    pub fn get_project(env: Env, project_id: BytesN<16>) -> Result<Project, Error> {
        leer(&env, &DataKey::Project(project_id)).ok_or(Error::ProyectoNoExiste)
    }

    pub fn get_milestone(env: Env, project_id: BytesN<16>, index: u32) -> Result<Milestone, Error> {
        leer(&env, &DataKey::Milestone(project_id, index)).ok_or(Error::HitoNoExiste)
    }

    /// Registra el pago de una cuota o de las arras. Exige la firma del
    /// administrador del proyecto (la fiduciaria confirma que el dinero llegó; la
    /// compradora no firma esta operación). Mueve `amount` del token del proyecto
    /// desde el administrador hacia el contrato y lo suma al saldo retenido y al
    /// aporte acumulado de esa compra. Funciona aunque el proyecto esté congelado:
    /// que entre dinero no es un riesgo.
    pub fn deposit(
        env: Env,
        project_id: BytesN<16>,
        purchase_id: BytesN<16>,
        amount: i128,
    ) -> Result<(), Error> {
        let project_key = DataKey::Project(project_id.clone());
        let project: Project = leer(&env, &project_key).ok_or(Error::ProyectoNoExiste)?;

        project.administrador.require_auth();

        if amount <= 0 {
            return Err(Error::MontoInvalido);
        }

        let token_client = token::Client::new(&env, &project.token);
        token_client.transfer(&project.administrador, &env.current_contract_address(), &amount);

        let balance_key = DataKey::EscrowBalance(project_id.clone());
        let saldo_actual: i128 = leer(&env, &balance_key).unwrap_or(0);
        guardar(&env, &balance_key, &(saldo_actual + amount));

        let contribution_key = DataKey::Contribution(project_id, purchase_id);
        let aporte_actual: i128 = leer(&env, &contribution_key).unwrap_or(0);
        guardar(&env, &contribution_key, &(aporte_actual + amount));

        Ok(())
    }

    /// Reporta el avance de un hito. Exige la firma de la constructora del
    /// proyecto. Solo se puede reportar un hito `EnCurso` (el flujo normal) u
    /// `Observado` (para corregir uno rechazado); cualquier otro estado se
    /// rechaza, así nadie salta un mes ni reporta el mismo hito dos veces. Admite
    /// reportar después de la fecha límite y deja constancia del momento exacto.
    pub fn report_milestone(
        env: Env,
        project_id: BytesN<16>,
        index: u32,
        evidence_hash: BytesN<32>,
        photo_count: u32,
    ) -> Result<(), Error> {
        let project: Project =
            leer(&env, &DataKey::Project(project_id.clone())).ok_or(Error::ProyectoNoExiste)?;
        project.constructora.require_auth();

        let milestone_key = DataKey::Milestone(project_id.clone(), index);
        let mut milestone: Milestone = leer(&env, &milestone_key).ok_or(Error::HitoNoExiste)?;

        match milestone.status {
            MilestoneStatus::EnCurso | MilestoneStatus::Observado => {}
            _ => return Err(Error::HitoNoEnCurso),
        }

        if photo_count < MIN_FOTOS {
            return Err(Error::FotosInsuficientes);
        }

        if evidence_hash == BytesN::from_array(&env, &[0u8; 32]) {
            return Err(Error::EvidenciaVacia);
        }

        milestone.status = MilestoneStatus::Reportado;
        guardar(&env, &milestone_key, &milestone);

        let report = Report {
            evidence_hash: evidence_hash.clone(),
            photo_count,
            reported_at: env.ledger().timestamp(),
        };
        guardar(&env, &DataKey::Report(project_id.clone(), index), &report);

        MilestoneReported {
            project_id,
            index,
            evidence_hash,
        }
        .publish(&env);

        Ok(())
    }

    /// Certifica el avance de un hito. Exige la firma del interventor del
    /// proyecto. El hito debe estar `Reportado` y el hash debe coincidir con el
    /// que firmó la constructora. Paga de una vez `min(monto_del_hito, saldo
    /// retenido)`: si alcanza para todo, el hito queda `Desembolsado`; si no,
    /// queda `Certificado` con un pendiente que se cobra después con
    /// `claim_pending`. Abre el hito siguiente en este mismo momento (no cuando
    /// se complete el pago). Primero valida, luego guarda todo el estado nuevo, y
    /// solo al final mueve los tokens.
    pub fn certify_milestone(
        env: Env,
        project_id: BytesN<16>,
        index: u32,
        evidence_hash: BytesN<32>,
    ) -> Result<(), Error> {
        // --- 1. Validar ---
        let project: Project =
            leer(&env, &DataKey::Project(project_id.clone())).ok_or(Error::ProyectoNoExiste)?;
        project.interventor.require_auth();

        if project.congelado {
            return Err(Error::ProyectoCongelado);
        }
        let compliance: bool =
            leer(&env, &DataKey::Compliance(project_id.clone())).unwrap_or(false);
        if !compliance {
            return Err(Error::DocumentosVencidos);
        }

        let milestone_key = DataKey::Milestone(project_id.clone(), index);
        let mut milestone: Milestone = leer(&env, &milestone_key).ok_or(Error::HitoNoExiste)?;
        if milestone.status != MilestoneStatus::Reportado {
            return Err(Error::HitoNoReportado);
        }

        let report: Report =
            leer(&env, &DataKey::Report(project_id.clone(), index)).ok_or(Error::ReporteNoExiste)?;
        if report.evidence_hash != evidence_hash {
            return Err(Error::HashNoCoincide);
        }

        let monto = monto_hito(project.presupuesto_total, &milestone)?;
        let balance_key = DataKey::EscrowBalance(project_id.clone());
        let saldo: i128 = leer(&env, &balance_key).unwrap_or(0);
        let pagado = core::cmp::min(monto, saldo);
        let pendiente = monto - pagado;

        let ahora = env.ledger().timestamp();
        let tarde = ahora > milestone.deadline;
        let atraso_segundos = if tarde { ahora - milestone.deadline } else { 0 };

        // --- 2. Guardar el estado nuevo ---
        let completado = pendiente == 0;
        milestone.status = if completado {
            MilestoneStatus::Desembolsado
        } else {
            MilestoneStatus::Certificado
        };
        guardar(&env, &milestone_key, &milestone);

        guardar(&env, &balance_key, &(saldo - pagado));

        if completado {
            cerrar_si_ultimo_hito(&env, &project_id, index, &project);
        }

        guardar(
            &env,
            &DataKey::Certification(project_id.clone(), index),
            &Certification {
                certified_at: ahora,
                late: tarde,
                late_by_seconds: atraso_segundos,
                paid: pagado,
                pending: pendiente,
            },
        );

        if pagado > 0 {
            let released_key = DataKey::ReleasedTotal(project_id.clone());
            let liberado_antes: i128 = leer(&env, &released_key).unwrap_or(0);
            guardar(&env, &released_key, &(liberado_antes + pagado));
        }

        // El hito siguiente abre ahora, al certificar, sin importar si el pago
        // de este quedó completo o parcial. Si no hay un hito siguiente (este
        // era el último), no hay nada que abrir.
        let siguiente_key = DataKey::Milestone(project_id.clone(), index + 1);
        if let Some(mut siguiente) = leer::<Milestone>(&env, &siguiente_key) {
            if siguiente.status == MilestoneStatus::Pendiente {
                siguiente.status = MilestoneStatus::EnCurso;
                guardar(&env, &siguiente_key, &siguiente);
            }
        }

        // --- 3. Mover los tokens, al final ---
        if pagado > 0 {
            let token_client = token::Client::new(&env, &project.token);
            token_client.transfer(
                &env.current_contract_address(),
                &project.constructora,
                &pagado,
            );
        }

        MilestoneCertified {
            project_id: project_id.clone(),
            index,
            late: tarde,
            late_by_seconds: atraso_segundos,
        }
        .publish(&env);

        Disbursed {
            project_id,
            index,
            paid: pagado,
            pending: pendiente,
        }
        .publish(&env);

        Ok(())
    }

    /// Observa (rechaza) un hito reportado: el interventor encontró un problema
    /// y la constructora debe corregir y volver a reportar. Exige la firma del
    /// interventor y que el hito esté `Reportado`.
    pub fn observe_milestone(
        env: Env,
        project_id: BytesN<16>,
        index: u32,
        reason_hash: BytesN<32>,
    ) -> Result<(), Error> {
        let project: Project =
            leer(&env, &DataKey::Project(project_id.clone())).ok_or(Error::ProyectoNoExiste)?;
        project.interventor.require_auth();

        let milestone_key = DataKey::Milestone(project_id.clone(), index);
        let mut milestone: Milestone = leer(&env, &milestone_key).ok_or(Error::HitoNoExiste)?;
        if milestone.status != MilestoneStatus::Reportado {
            return Err(Error::HitoNoReportado);
        }

        milestone.status = MilestoneStatus::Observado;
        guardar(&env, &milestone_key, &milestone);

        MilestoneObserved {
            project_id,
            index,
            reason_hash,
        }
        .publish(&env);

        Ok(())
    }

    /// Marca un hito como vencido. No exige ninguna firma: cualquiera puede
    /// avisar que una fecha límite pasó. Solo aplica a un hito abierto y sin
    /// certificar (`EnCurso`, `Reportado` u `Observado`); cualquier otro estado
    /// es `HitoNoVencible`. No cambia el estado del hito ni mueve dinero, solo
    /// deja un registro auditable y evita avisos duplicados.
    pub fn check_overdue(env: Env, project_id: BytesN<16>, index: u32) -> Result<(), Error> {
        let milestone: Milestone =
            leer(&env, &DataKey::Milestone(project_id.clone(), index)).ok_or(Error::HitoNoExiste)?;

        match milestone.status {
            MilestoneStatus::EnCurso | MilestoneStatus::Reportado | MilestoneStatus::Observado => {}
            _ => return Err(Error::HitoNoVencible),
        }

        let ahora = env.ledger().timestamp();
        if ahora <= milestone.deadline {
            return Err(Error::AunNoVence);
        }

        let overdue_key = DataKey::Overdue(project_id.clone(), index);
        if env.storage().persistent().has(&overdue_key) {
            return Err(Error::YaMarcadoVencido);
        }

        let late_by_seconds = ahora - milestone.deadline;
        guardar(
            &env,
            &overdue_key,
            &Overdue {
                marked_at: ahora,
                late_by_seconds,
            },
        );

        MilestoneOverdue {
            project_id,
            index,
            late_by_seconds,
        }
        .publish(&env);

        Ok(())
    }

    pub fn get_overdue(env: Env, project_id: BytesN<16>, index: u32) -> Result<Overdue, Error> {
        leer(&env, &DataKey::Overdue(project_id, index)).ok_or(Error::VencimientoNoExiste)
    }

    /// Congela el proyecto: bloquea `certify_milestone` y `claim_pending`, pero
    /// deja seguir cobrando depósitos, reportando y observando. Exige la firma
    /// del administrador.
    pub fn freeze(env: Env, project_id: BytesN<16>, reason_hash: BytesN<32>) -> Result<(), Error> {
        let project_key = DataKey::Project(project_id.clone());
        let mut project: Project = leer(&env, &project_key).ok_or(Error::ProyectoNoExiste)?;
        project.administrador.require_auth();

        if project.congelado {
            return Err(Error::YaCongelado);
        }

        project.congelado = true;
        guardar(&env, &project_key, &project);

        let ahora = env.ledger().timestamp();
        guardar(
            &env,
            &DataKey::Freeze(project_id.clone()),
            &Freeze {
                frozen_at: ahora,
                reason_hash: reason_hash.clone(),
                unfrozen_at: None,
            },
        );

        ProjectFrozen {
            project_id,
            reason_hash,
        }
        .publish(&env);

        Ok(())
    }

    /// Descongela el proyecto. Exige la firma del administrador.
    pub fn unfreeze(env: Env, project_id: BytesN<16>) -> Result<(), Error> {
        let project_key = DataKey::Project(project_id.clone());
        let mut project: Project = leer(&env, &project_key).ok_or(Error::ProyectoNoExiste)?;
        project.administrador.require_auth();

        if !project.congelado {
            return Err(Error::NoCongelado);
        }

        project.congelado = false;
        guardar(&env, &project_key, &project);

        let freeze_key = DataKey::Freeze(project_id.clone());
        let ahora = env.ledger().timestamp();
        let mut freeze_info: Freeze = leer(&env, &freeze_key).unwrap_or(Freeze {
            frozen_at: ahora,
            reason_hash: BytesN::from_array(&env, &[0u8; 32]),
            unfrozen_at: None,
        });
        freeze_info.unfrozen_at = Some(ahora);
        guardar(&env, &freeze_key, &freeze_info);

        ProjectUnfrozen { project_id }.publish(&env);

        Ok(())
    }

    /// Último registro de congelamiento del proyecto (se conserva como
    /// historial aunque ya se haya descongelado).
    pub fn get_freeze(env: Env, project_id: BytesN<16>) -> Result<Freeze, Error> {
        leer(&env, &DataKey::Freeze(project_id)).ok_or(Error::FreezeNoExiste)
    }

    /// Propone cambios de porcentaje y/o fecha límite a uno o más hitos que
    /// todavía no han empezado. Exige la firma de la constructora. Solo puede
    /// haber una solicitud pendiente a la vez; el interventor la resuelve con
    /// `resolve_schedule_change`.
    pub fn request_schedule_change(
        env: Env,
        project_id: BytesN<16>,
        items: Vec<ScheduleChangeItem>,
        reason_hash: BytesN<32>,
        new_schedule_hash: BytesN<32>,
    ) -> Result<(), Error> {
        let project: Project =
            leer(&env, &DataKey::Project(project_id.clone())).ok_or(Error::ProyectoNoExiste)?;
        project.constructora.require_auth();

        let request_key = DataKey::ScheduleRequest(project_id.clone());
        if env.storage().persistent().has(&request_key) {
            return Err(Error::SolicitudPendiente);
        }

        let tope_bps = core::cmp::max(TOPE_MINIMO_BPS, TOPE_BASE_BPS / project.milestone_count);
        let ahora = env.ledger().timestamp();

        // Validar cada hito tocado: existe, está Pendiente, índice no repetido,
        // respeta el tope y su nueva fecha es posterior a ahora. De paso vamos
        // sumando los porcentajes actuales y los nuevos para comparar al final.
        let mut indices_vistos: Vec<u32> = Vec::new(&env);
        let mut suma_actual: u32 = 0;
        let mut suma_nueva: u32 = 0;
        for item in items.iter() {
            if indices_vistos.contains(&item.index) {
                return Err(Error::IndiceRepetido);
            }
            indices_vistos.push_back(item.index);

            let hito: Milestone = leer(&env, &DataKey::Milestone(project_id.clone(), item.index))
                .ok_or(Error::HitoNoExiste)?;
            if hito.status != MilestoneStatus::Pendiente {
                return Err(Error::HitoNoModificable);
            }
            if item.new_bps > tope_bps {
                return Err(Error::HitoExcedeTope);
            }
            if item.new_deadline <= ahora {
                return Err(Error::FechaPasada);
            }

            suma_actual += hito.percentage_bps;
            suma_nueva += item.new_bps;
        }

        if suma_actual != suma_nueva {
            return Err(Error::TotalNoConservado);
        }

        // Con los cambios aplicados en memoria, el cronograma completo debe
        // seguir teniendo fechas estrictamente crecientes.
        let mut fecha_anterior: u64 = 0;
        for i in 0..project.milestone_count {
            let hito: Milestone =
                leer(&env, &DataKey::Milestone(project_id.clone(), i)).ok_or(Error::HitoNoExiste)?;
            let fecha = items
                .iter()
                .find(|item| item.index == i)
                .map(|item| item.new_deadline)
                .unwrap_or(hito.deadline);
            if i > 0 && fecha <= fecha_anterior {
                return Err(Error::FechasNoCrecientes);
            }
            fecha_anterior = fecha;
        }

        guardar(
            &env,
            &request_key,
            &ScheduleChangeRequest {
                items,
                reason_hash: reason_hash.clone(),
                new_schedule_hash,
                requested_at: ahora,
            },
        );

        ScheduleChangeRequested {
            project_id,
            reason_hash,
        }
        .publish(&env);

        Ok(())
    }

    /// Resuelve la solicitud de cambio de cronograma pendiente. Exige la firma
    /// del interventor. Al aprobar, aplica los cambios y recalcula el
    /// porcentaje acumulado de todos los hitos y el hash del cronograma; al
    /// rechazar, no cambia nada. En ambos casos la solicitud se cierra.
    pub fn resolve_schedule_change(
        env: Env,
        project_id: BytesN<16>,
        approve: bool,
        note_hash: BytesN<32>,
    ) -> Result<(), Error> {
        let project_key = DataKey::Project(project_id.clone());
        let mut project: Project = leer(&env, &project_key).ok_or(Error::ProyectoNoExiste)?;
        project.interventor.require_auth();

        let request_key = DataKey::ScheduleRequest(project_id.clone());
        let request: ScheduleChangeRequest = leer(&env, &request_key).ok_or(Error::SinSolicitud)?;

        if approve {
            for item in request.items.iter() {
                let milestone_key = DataKey::Milestone(project_id.clone(), item.index);
                let mut hito: Milestone = leer(&env, &milestone_key).ok_or(Error::HitoNoExiste)?;
                hito.percentage_bps = item.new_bps;
                hito.deadline = item.new_deadline;
                guardar(&env, &milestone_key, &hito);
            }

            // El cambio de cualquier hito desplaza el acumulado de todos los
            // que vienen después, así que se recalculan todos de una vez.
            let mut acumulado: u32 = 0;
            for i in 0..project.milestone_count {
                let milestone_key = DataKey::Milestone(project_id.clone(), i);
                let mut hito: Milestone = leer(&env, &milestone_key).ok_or(Error::HitoNoExiste)?;
                acumulado += hito.percentage_bps;
                hito.cumulative_bps = acumulado;
                guardar(&env, &milestone_key, &hito);
            }

            project.hash_cronograma = request.new_schedule_hash.clone();
            guardar(&env, &project_key, &project);

            ScheduleChanged {
                project_id: project_id.clone(),
                new_schedule_hash: request.new_schedule_hash,
            }
            .publish(&env);
        } else {
            ScheduleChangeRejected {
                project_id: project_id.clone(),
                note_hash,
            }
            .publish(&env);
        }

        env.storage().persistent().remove(&request_key);

        Ok(())
    }

    pub fn get_schedule_request(
        env: Env,
        project_id: BytesN<16>,
    ) -> Result<ScheduleChangeRequest, Error> {
        leer(&env, &DataKey::ScheduleRequest(project_id)).ok_or(Error::SolicitudNoExiste)
    }

    /// Cobra el pendiente que quedó de una certificación parcial. Exige la firma
    /// de la constructora. Solo funciona sobre un hito `Certificado` que todavía
    /// tenga pendiente (si no, `HitoSinPendiente`); respeta el congelamiento y el
    /// compliance igual que `certify_milestone`. Paga `min(pendiente, saldo
    /// retenido)`; si el pendiente llega a cero, el hito pasa a `Desembolsado`.
    /// Guarda todo el estado antes de mover los tokens.
    pub fn claim_pending(env: Env, project_id: BytesN<16>, index: u32) -> Result<(), Error> {
        // --- 1. Validar ---
        let project: Project =
            leer(&env, &DataKey::Project(project_id.clone())).ok_or(Error::ProyectoNoExiste)?;
        project.constructora.require_auth();

        if project.congelado {
            return Err(Error::ProyectoCongelado);
        }
        let compliance: bool =
            leer(&env, &DataKey::Compliance(project_id.clone())).unwrap_or(false);
        if !compliance {
            return Err(Error::DocumentosVencidos);
        }

        let milestone_key = DataKey::Milestone(project_id.clone(), index);
        let mut milestone: Milestone = leer(&env, &milestone_key).ok_or(Error::HitoNoExiste)?;
        if milestone.status != MilestoneStatus::Certificado {
            return Err(Error::HitoSinPendiente);
        }

        let certification_key = DataKey::Certification(project_id.clone(), index);
        let mut certification: Certification =
            leer(&env, &certification_key).ok_or(Error::HitoSinPendiente)?;
        if certification.pending <= 0 {
            return Err(Error::HitoSinPendiente);
        }

        let balance_key = DataKey::EscrowBalance(project_id.clone());
        let saldo: i128 = leer(&env, &balance_key).unwrap_or(0);
        let pagado = core::cmp::min(certification.pending, saldo);

        // --- 2. Guardar el estado nuevo ---
        certification.pending -= pagado;
        certification.paid += pagado;
        guardar(&env, &certification_key, &certification);

        if certification.pending == 0 {
            milestone.status = MilestoneStatus::Desembolsado;
            guardar(&env, &milestone_key, &milestone);
            cerrar_si_ultimo_hito(&env, &project_id, index, &project);
        }

        guardar(&env, &balance_key, &(saldo - pagado));

        if pagado > 0 {
            let released_key = DataKey::ReleasedTotal(project_id.clone());
            let liberado_antes: i128 = leer(&env, &released_key).unwrap_or(0);
            guardar(&env, &released_key, &(liberado_antes + pagado));
        }

        // --- 3. Mover los tokens, al final ---
        if pagado > 0 {
            let token_client = token::Client::new(&env, &project.token);
            token_client.transfer(
                &env.current_contract_address(),
                &project.constructora,
                &pagado,
            );
        }

        Disbursed {
            project_id,
            index,
            paid: pagado,
            pending: certification.pending,
        }
        .publish(&env);

        Ok(())
    }

    /// Saldo retenido en custodia para el proyecto. `0` si todavía no hay depósitos.
    pub fn get_balance(env: Env, project_id: BytesN<16>) -> i128 {
        leer(&env, &DataKey::EscrowBalance(project_id)).unwrap_or(0)
    }

    /// Aporte acumulado de una compra puntual. `0` si todavía no se depositó nada.
    pub fn get_contribution(env: Env, project_id: BytesN<16>, purchase_id: BytesN<16>) -> i128 {
        leer(&env, &DataKey::Contribution(project_id, purchase_id)).unwrap_or(0)
    }

    pub fn get_report(env: Env, project_id: BytesN<16>, index: u32) -> Result<Report, Error> {
        leer(&env, &DataKey::Report(project_id, index)).ok_or(Error::ReporteNoExiste)
    }

    /// Si la constructora tiene sus documentos legales vigentes. `false` si el
    /// proyecto no existe (nunca debería faltar una vez registrado).
    pub fn get_compliance(env: Env, project_id: BytesN<16>) -> bool {
        leer(&env, &DataKey::Compliance(project_id)).unwrap_or(false)
    }

    pub fn get_certification(
        env: Env,
        project_id: BytesN<16>,
        index: u32,
    ) -> Result<Certification, Error> {
        leer(&env, &DataKey::Certification(project_id, index)).ok_or(Error::CertificacionNoExiste)
    }

    /// Total pagado a la constructora hasta ahora (certificaciones y cobros de
    /// pendiente juntos). `0` si todavía no se ha pagado nada.
    pub fn get_released_total(env: Env, project_id: BytesN<16>) -> i128 {
        leer(&env, &DataKey::ReleasedTotal(project_id)).unwrap_or(0)
    }
}

mod test;
