export type AZCode = 'A1Z' | 'A2Z' | 'A3Z' | 'A4Z' | 'A5Z' | 'A6Z' | 'A7Z' | 'A8Z' | 'A9Z'
export type Rankings = Record<AZCode, number>

// Maps frontend image IDs (1-9, grid order left→right, top→bottom) to AZ codes.
// Verified against actual protocol images.
export const IMAGE_ID_TO_AZ: Record<number, AZCode> = {
  1: 'A9Z', // crack/fissure pattern        → de fisuras
  2: 'A8Z', // tight spiral on black bg     → en espiral
  3: 'A1Z', // fan lines converging to pt   → convergentes
  4: 'A6Z', // sharp zigzag lines           → agudas
  5: 'A5Z', // chain-link fence/mesh        → de red
  6: 'A4Z', // smooth wavy lines            → ondulantes
  7: 'A3Z', // tree roots + horiz. lines    → enraizadas
  8: 'A2Z', // geometric tessellation       → geométricas
  9: 'A7Z', // perspective vanishing grid   → estáticas
}

// slots: index = rank-1 (slot 0 = rank 1 = most preferred), value = imageId
export function slotsToRankings(slots: (number | null)[]): Rankings | null {
  if (slots.some((s) => s === null)) return null
  const r = {} as Rankings
  slots.forEach((id, i) => {
    r[IMAGE_ID_TO_AZ[id!]] = i + 1
  })
  return r
}

export interface UserData {
  nombre: string
  apellido: string
  edad: string
  sexo: string
  estadoCivil: string
  ocupacion: string
  estudios: string
  convivientes: string
}

// Square number (label in physical protocol): A1Z=1 … A9Z=9
export const AZ_TO_SQUARE: Record<AZCode, number> = {
  A1Z: 1, A2Z: 2, A3Z: 3, A4Z: 4, A5Z: 5, A6Z: 6, A7Z: 7, A8Z: 8, A9Z: 9,
}

// ---------------------------------------------------------------------------
// Negative Trio (Tánatos) — A7Z · A8Z · A9Z
// ---------------------------------------------------------------------------

type NegativeLevel = 'muy_activo' | 'regularmente_activo' | 'poco_activo' | 'casi_desactivado' | 'desactivado'

export interface NegativePrioridad {
  code: 'A7Z' | 'A8Z' | 'A9Z'
  rank: number
  priority: 1 | 2 | 3
  conductaLabel: string
}

export interface NegativeTrioResult {
  sum: number
  level: NegativeLevel
  levelLabel: string
  levelText: string
  dominant: 'A7Z' | 'A8Z' | 'A9Z'
  dominantLabel: string
  clave: string
  prioridades: NegativePrioridad[]
}

// Exact text per sum value, as in the Excel spreadsheet
function negativeSumText(sum: number): { level: NegativeLevel; label: string; text: string } {
  if (sum === 6)
    return { level: 'muy_activo', label: 'Muy activo negativo',
      text: 'Su estilo de afrontamiento negativo está muy activo y manifiesta mucha carga desorganizativa evidente.' }
  if (sum <= 9)
    return { level: 'regularmente_activo', label: 'Regularmente activo',
      text: 'Su estilo de afrontamiento negativo está regularmente activo y manifiesta regular carga desorganizativa evidente.' }
  if (sum <= 20)
    return { level: 'poco_activo', label: 'Poco activo',
      text: 'Su estilo de afrontamiento negativo está poco activo y manifiesta alguna carga desorganizativa latente.' }
  if (sum <= 23)
    return { level: 'casi_desactivado', label: 'Casi desactivado',
      text: 'Su estilo de afrontamiento negativo está casi desactivado y se encuentra casi libre de carga negativa.' }
  return { level: 'desactivado', label: 'Desactivado',
    text: 'Su estilo de afrontamiento negativo está desactivado y se encuentra libre de carga negativa.' }
}

const NEGATIVE_DOMINANT_LABELS: Record<'A7Z' | 'A8Z' | 'A9Z', string> = {
  A7Z: 'Desmotivación (pensamientos de obsolescencia)',
  A8Z: 'Descontrol (pensamientos de irreflexión)',
  A9Z: 'Desintegración (pensamientos de desmoronamiento)',
}

const CONDUCTA_LABELS: Record<'A7Z' | 'A8Z' | 'A9Z', string> = {
  A7Z: 'Conductas de Desmotivación',
  A8Z: 'Conductas de Descontrol',
  A9Z: 'Conductas de Desintegración',
}

function calcNegativeTrio(r: Rankings): NegativeTrioResult {
  const sum = r.A7Z + r.A8Z + r.A9Z
  const { level, label, text } = negativeSumText(sum)
  const trio = ['A7Z', 'A8Z', 'A9Z'] as const
  const dominant = trio.reduce((a, b) => (r[a] < r[b] ? a : b))
  const sorted = trio.slice().sort((a, b) => r[a] - r[b])
  const clave = sorted.join('-')
  const prioridades: NegativePrioridad[] = trio.map((code) => ({
    code,
    rank: r[code],
    priority: (sorted.indexOf(code) + 1) as 1 | 2 | 3,
    conductaLabel: CONDUCTA_LABELS[code],
  }))
  return { sum, level, levelLabel: label, levelText: text, dominant, dominantLabel: NEGATIVE_DOMINANT_LABELS[dominant], clave, prioridades }
}

// ---------------------------------------------------------------------------
// Three Pairs
// ---------------------------------------------------------------------------

export interface PairResult {
  winner: AZCode
  label: string
  orientation: string   // short label used in coping style dimensions
  description: string   // exact text from spreadsheet
}

export interface ThreePairsResult {
  par1: PairResult  // A5Z vs A2Z — Simple / Compleja
  par2: PairResult  // A1Z vs A3Z — Perspectiva (optimismo) / Retrospectiva (materialismo)
  par3: PairResult  // A6Z vs A4Z — Rayos (proactividad) / Ondas (equilibrio)
}

function calcThreePairs(r: Rankings): ThreePairsResult {
  return {
    par1: r.A5Z < r.A2Z
      ? { winner: 'A5Z', label: 'Simple', orientation: 'Elemental',
          description: 'Orientado a lo sencillo, enfrenta la inseguridad buscando respuestas claras y directas.' }
      : { winner: 'A2Z', label: 'Compleja', orientation: 'Sofisticado',
          description: 'Orientado a lo complicado, enfrenta a la inseguridad encontrando respuestas muy elaboradas.' },
    par2: r.A1Z < r.A3Z
      ? { winner: 'A1Z', label: 'Perspectiva', orientation: 'Renovar',
          description: 'Orientado al optimismo, enfrenta al futuro pensando que la vida está llena de oportunidades.' }
      : { winner: 'A3Z', label: 'Retrospectiva', orientation: 'Preservar',
          description: 'Orientado al materialismo, enfrenta al futuro con realismo y siguiendo los principios o tradiciones.' },
    par3: r.A6Z < r.A4Z
      ? { winner: 'A6Z', label: 'Rayos', orientation: 'Enérgico',
          description: 'Orientado a la impulsividad, enfrenta situaciones estresantes con energía y vigor.' }
      : { winner: 'A4Z', label: 'Ondas', orientation: 'Cálido',
          description: 'Orientado al equilibrio, enfrenta a las situaciones estresantes con serenidad y madurez.' },
  }
}

// ---------------------------------------------------------------------------
// Coping Style (8 types)
// ---------------------------------------------------------------------------

export type CopingStyle =
  | 'Almirante' | 'Promotor' | 'Combatiente' | 'Gerente'
  | 'Caudillo'  | 'Caballero' | 'Magnate'    | 'Estadista'

const COPING_DESCRIPTIONS: Record<CopingStyle, string> = {
  Almirante:   'Conocimiento elemental + Planeamiento preservador + Enfrentamiento enérgico. Liderazgo directo y pragmático, orientado a la acción y la tradición.',
  Promotor:    'Conocimiento elemental + Planeamiento preservador + Enfrentamiento cálido. Motivador cercano que construye desde la base con calidez humana.',
  Combatiente: 'Conocimiento elemental + Planeamiento renovador + Enfrentamiento enérgico. Agente de cambio activo que impulsa la innovación con determinación.',
  Gerente:     'Conocimiento elemental + Planeamiento renovador + Enfrentamiento cálido. Gestor adaptable y empático que facilita transformaciones con tacto.',
  Caudillo:    'Conocimiento sofisticado + Planeamiento preservador + Enfrentamiento enérgico. Líder estratégico y contundente que combina visión con firmeza.',
  Caballero:   'Conocimiento sofisticado + Planeamiento preservador + Enfrentamiento cálido. Profesional íntegro que une preparación con sensibilidad relacional.',
  Magnate:     'Conocimiento sofisticado + Planeamiento renovador + Enfrentamiento enérgico. Visionario innovador que combina inteligencia estratégica con decisión.',
  Estadista:   'Conocimiento sofisticado + Planeamiento renovador + Enfrentamiento cálido. Líder integrador que transforma con sabiduría, inclusión y diplomacia.',
}

export interface CopingStyleResult {
  style: CopingStyle
  description: string
  dimensions: {
    conocimiento:   'Elemental'  | 'Sofisticado'
    planeamiento:   'Preservar'  | 'Renovar'
    enfrentamiento: 'Enérgico'   | 'Cálido'
  }
}

function calcCopingStyle(r: Rankings): CopingStyleResult {
  const elemental = r.A5Z < r.A2Z   // true = Elemental / Simple
  const preservar = r.A3Z < r.A1Z   // true = Preservar / Retrospectiva
  const energico  = r.A6Z < r.A4Z   // true = Enérgico  / Rayos

  let style: CopingStyle
  if ( elemental &&  preservar &&  energico) style = 'Almirante'
  else if ( elemental &&  preservar && !energico) style = 'Promotor'
  else if ( elemental && !preservar &&  energico) style = 'Combatiente'
  else if ( elemental && !preservar && !energico) style = 'Gerente'
  else if (!elemental &&  preservar &&  energico) style = 'Caudillo'
  else if (!elemental &&  preservar && !energico) style = 'Caballero'
  else if (!elemental && !preservar &&  energico) style = 'Magnate'
  else                                            style = 'Estadista'

  return {
    style,
    description: COPING_DESCRIPTIONS[style],
    dimensions: {
      conocimiento:   elemental ? 'Elemental'  : 'Sofisticado',
      planeamiento:   preservar ? 'Preservar'  : 'Renovar',
      enfrentamiento: energico  ? 'Enérgico'   : 'Cálido',
    },
  }
}

// ---------------------------------------------------------------------------
// Individual Line Positions
// ---------------------------------------------------------------------------

type PositionZone = 'alta_preferencia' | 'indiferencia' | 'alto_rechazo'

export interface LinePosition {
  code: AZCode
  name: string
  rank: number
  zone: PositionZone
  zoneLabel: string
  interpretation: string
}

const LINE_NAMES: Record<AZCode, string> = {
  A1Z: 'Convergentes',
  A2Z: 'Geométricas',
  A3Z: 'Enraizadas',
  A4Z: 'Ondulantes',
  A5Z: 'De red',
  A6Z: 'Agudas',
  A7Z: 'Estáticas',
  A8Z: 'En espiral',
  A9Z: 'De fisuras',
}

// [alta_preferencia (rank 1-3), indiferencia (rank 4-6), alto_rechazo (rank 7-9)]
// Text sourced from Excel spreadsheet (primera/última línea elegida + A7/A8/A9 lookup tables)
const LINE_INTERPRETATIONS: Record<AZCode, [string, string, string]> = {
  A1Z: [
    'Piensa con idealismo. Se enfrenta al futuro con optimismo y piensa que la vida está llena de oportunidades. Siente que crece hacia fuera (influye en los demás, obtiene prestigio entre sus colegas), quiere avanzar y proyecta conocer nuevas personas o cosas. Invierte tiempo en viajes. Prefiere lo moderno, la innovación, lo extranjero o exótico. Resuelve sus problemas avanzando, experimentando, conociendo. Psicodinámica de la energía: Canalizando energía, programando energía.',
    'Influencia moderada de las líneas convergentes. Actitud equilibrada entre el idealismo y el pragmatismo.',
    'No piensa con idealismo. No siente el futuro con optimismo y no cree que la vida esté llena de oportunidades. No quiere avanzar ni proyectar, y no desea conocer nuevas personas. No invierte tiempo en viajes. Rechaza lo moderno, la innovación, lo extranjero o exótico.',
  ],
  A2Z: [
    'Prefiere lo complicado. Se enfrenta a la inseguridad encontrando respuestas muy elaboradas o descubriendo relaciones subyacentes en los contextos. Prefiere un trabajo donde use su inteligencia y paciencia cuyos resultados se ven después de un tiempo prolongado. Resuelve sus problemas reflexionando calmadamente. Da interpretaciones profundas. Aprecia el trabajo complicado. Psicodinámica de la energía: Energía inteligente, Energía complicada.',
    'Influencia moderada de las líneas geométricas. Capacidad analítica presente sin predominio.',
    'Rechaza lo complicado. Desconfía de las respuestas muy elaboradas o sofisticadas. Se aleja de los trabajos que impliquen reflexionar y tomar decisiones difíciles. Comprende con dificultad las interpretaciones metafóricas. Detesta el trabajo de labores abstractas, complicadas y cambiantes.',
  ],
  A3Z: [
    'Piensa con materialismo. Se enfrenta al futuro con realismo y piensa que la vida se rige por principios y tradiciones. Siente que se detiene pero crece hacia adentro (de sí mismo), se auto realiza: No avanza pero se enraíza en su familia o trabajo. Invierte tiempo en el hogar, los estudios o trabajo. Prefiere lo tradicional, lo conocido. Pisa tierra, es realista. Resuelve sus problemas teniendo una base sólida, un punto de apoyo. Psicodinámica de la energía: Cargando energía, Absorbiendo energía.',
    'Influencia moderada de las líneas enraizadas. Tendencia al realismo y la estabilidad sin rigidez.',
    'No piensa con materialismo. Piensa que no es productivo, ni alcanza sus metas. No siente que crece hacia adentro de sí mismo. No se autorealiza personal o profesionalmente. No busca acumular reservas para la época de escasez. No invierte tiempo en el trabajo, hogar, o amigos sinceros. No le gustan las circunstancias que le tocó vivir en el pasado.',
  ],
  A4Z: [
    'Actúa con equilibrio. Se enfrenta a las situaciones estresantes con serenidad y madurez. Siempre está en movimiento constante. Prefiere avanzar de acuerdo a las circunstancias. Resuelve sus problemas retirándose cuando sabe que será derrotado, o abordando cuando sabe que triunfará. Psicodinámica de la energía: Energía equilibrada, Energía ondulante.',
    'Influencia moderada de las líneas ondulantes. Capacidad de adaptación presente de forma parcial.',
    'No quiere actuar con equilibrio. No se acostumbra a convivir con serenidad ni tranquilidad. No se siente a gusto en un mundo de emociones afectuosas, tranquilizantes y cariñosas. Detesta avanzar de acuerdo a las convenciones sociales y sentimentales.',
  ],
  A5Z: [
    'Prefiere lo sencillo. Se enfrenta a la inseguridad encontrando respuestas claras, directas y convincentes. Prefiere un trabajo rápido cuyos resultados se verán inmediatamente. Resuelve sus problemas teniendo una red de amigos que lo ayudan. Da interpretaciones rápidas, intuitivas y circunstanciales. Aprecia la espontaneidad. Psicodinámica de la energía: Energía en red, Energía cooperativa, Uniendo Energía, Conectando energía.',
    'Influencia moderada de las líneas de red. Tendencia a la sencillez y conexión sin predominio marcado.',
    'Rechaza lo sencillo. Desconfía de las respuestas directas y espontáneas. Se aleja de los trabajos que impliquen decisiones rápidas, intuitivas y circunstanciales. Rechaza la naturalidad y espontaneidad. Detesta el trabajo de labores concretas, sencillas y repetitivas.',
  ],
  A6Z: [
    'Actúa con proactividad. Se enfrenta a las situaciones estresantes con mucha energía, está impaciente por actuar. Es penetrante. Prefiere ser activo, impulsivo, avanza casi sin planificación, quiere tomar la iniciativa. Resuelve sus problemas con iniciativa. Intuye que la mejor defensa es un ataque preventivo. Psicodinámica de la energía: Energía activa, Energía explosiva.',
    'Influencia moderada de las líneas agudas. Energía y decisión presentes de forma controlada.',
    'No actúa con proactividad. Detesta ser impulsivo, arriesgado, vehemente y agresivo. No quiere tomar la iniciativa ni avanzar sin planificación. No se siente a gusto en un mundo de emociones rudas, explosivas, ni en situaciones peligrosas o ilegales.',
  ],
  // Negative lines: interpretation describes activation level of the negative field
  A7Z: [
    'Líneas estáticas A7Z: Muchos pensamientos de obsolescencia. Cree estar inmovilizado. Se siente atascado, no sabe qué hacer. No tiene autonomía, sus iniciativas son neutralizadas por otros. Se enfrenta a los problemas actuando con desaliento, casi desactivado o detenido. Psicodinámica de la energía: Energía detenida, Energías en conflicto, Energías opuestas, Neutralizadas.',
    'Líneas estáticas A7Z: Algún pensamiento de obsolescencia. Campo negativo parcialmente activo.',
    'Líneas estáticas A7Z: Ningún pensamiento de obsolescencia. No cree estar inmovilizado ni detenido. No siente que sus iniciativas sean neutralizadas por otros. Campo negativo desactivado.',
  ],
  A8Z: [
    'Líneas en espiral A8Z: Muchos pensamientos de irreflexión. Siente que corre en círculos y piensa que se esfuerza por nada. Se enfrenta a los problemas con energía dejándose arrastrar por su entusiasmo, admiración, fascinación. Psicodinámica de la energía: Energía desgastándose, Energía entusiasta, Energía circular, Energía atrapada en círculos.',
    'Líneas en espiral A8Z: Algún pensamiento de irreflexión. Campo negativo parcialmente activo.',
    'Líneas en espiral A8Z: Ningún pensamiento de irreflexión. No siente que corre en círculos ni que se esfuerza por nada. No se deja arrastrar por el entusiasmo ni soluciones mágicas. Campo negativo desactivado.',
  ],
  A9Z: [
    'Líneas de fisura A9Z: Muchos pensamientos de desmoronamiento. Siente que la solidez de sus planes se resquebraja. Sabe que el final se acerca inexorablemente. Los problemas lo superan enormemente. Se enfrenta a ellos con pesimismo y resignación. Psicodinámica de la energía: Energía en deterioro, Energía desorganizada, Energía disminuyendo.',
    'Líneas de fisura A9Z: Algún pensamiento de desmoronamiento. Campo negativo parcialmente activo.',
    'Líneas de fisura A9Z: Ningún pensamiento de desmoronamiento. No siente que sus planes se resquebrajen ni que el final se acerque. No piensa que los problemas lo superan. Campo negativo desactivado.',
  ],
}

function calcIndividualPositions(r: Rankings): LinePosition[] {
  const codes: AZCode[] = ['A1Z', 'A2Z', 'A3Z', 'A4Z', 'A5Z', 'A6Z', 'A7Z', 'A8Z', 'A9Z']
  return codes.map((code) => {
    const rank = r[code]
    const zone: PositionZone = rank <= 3 ? 'alta_preferencia' : rank <= 6 ? 'indiferencia' : 'alto_rechazo'
    const zoneLabel =
      zone === 'alta_preferencia' ? 'Primera elección (polo activo)'
      : zone === 'indiferencia'   ? 'Posición intermedia'
      :                             'Última elección (polo rechazado)'
    const [pos, neu, neg] = LINE_INTERPRETATIONS[code]
    const interpretation = zone === 'alta_preferencia' ? pos : zone === 'indiferencia' ? neu : neg
    return { code, name: LINE_NAMES[code], rank, zone, zoneLabel, interpretation }
  })
}

// ---------------------------------------------------------------------------
// Time Profile
// ---------------------------------------------------------------------------

export type TimeProfile = 'rapido' | 'normal' | 'analitico'

export interface TimeResult {
  seconds: number
  minutes: number
  profile: TimeProfile
  label: string
}

function calcTimeProfile(seconds: number): TimeResult {
  const minutes = Math.round(seconds / 60)
  if (seconds <= 120) return { seconds, minutes, profile: 'rapido',    label: 'Decisor rápido (1–2 minutos)' }
  if (seconds <= 240) return { seconds, minutes, profile: 'normal',    label: 'Tiempo normal (3–4 minutos)' }
  return                     { seconds, minutes, profile: 'analitico', label: 'Perfil analítico (5+ minutos)' }
}

// ---------------------------------------------------------------------------
// Main Result
// ---------------------------------------------------------------------------

export interface TestResult {
  rankings: Rankings
  claveAfrontamiento: string    // 9-digit string: square numbers in choice order (1st→9th)
  negativeTrio: NegativeTrioResult
  threePairs: ThreePairsResult
  copingStyle: CopingStyleResult
  individualPositions: LinePosition[]
  time: TimeResult | null
  userData: UserData
  timestamp: string
}

// Build 9-digit clave: for each rank 1→9, find the AZ code and convert to square number
function buildClave(rankings: Rankings): string {
  const codes = Object.keys(rankings) as AZCode[]
  return codes
    .sort((a, b) => rankings[a] - rankings[b])
    .map((c) => AZ_TO_SQUARE[c])
    .join('')
}

export function calculateResult(
  rankings: Rankings,
  userData: UserData,
  timeSeconds?: number,
): TestResult {
  return {
    rankings,
    claveAfrontamiento: buildClave(rankings),
    negativeTrio: calcNegativeTrio(rankings),
    threePairs: calcThreePairs(rankings),
    copingStyle: calcCopingStyle(rankings),
    individualPositions: calcIndividualPositions(rankings),
    time: timeSeconds != null ? calcTimeProfile(timeSeconds) : null,
    userData,
    timestamp: new Date().toISOString(),
  }
}
