import { NextRequest } from 'next/server'
import { calculateResult, slotsToRankings, UserData } from '@/lib/scoring'
import { createSupabasePublicClient } from '@/lib/supabase/public'

export async function POST(req: NextRequest) {
  let body: { token?: unknown; slots: unknown; userData: unknown; timeSeconds?: unknown; startedAt?: unknown; firstResponseTimes?: unknown; consentAccepted?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { token, slots, userData, timeSeconds, startedAt, firstResponseTimes, consentAccepted } = body

  if (!Array.isArray(slots) || slots.length !== 9) {
    return Response.json({ error: 'slots debe ser un array de 9 elementos' }, { status: 400 })
  }

  const rankings = slotsToRankings(slots as (number | null)[])
  if (!rankings) {
    return Response.json({ error: 'Todos los slots deben estar completos' }, { status: 400 })
  }

  if (typeof token !== 'string' || consentAccepted !== true) {
    return Response.json({ error: 'Se requiere un enlace válido y aceptación para iniciar' }, { status: 400 })
  }
  if (typeof startedAt !== 'string' || !Array.isArray(firstResponseTimes) || firstResponseTimes.length !== 9 || firstResponseTimes.some((value) => typeof value !== 'number' || value < 0)) {
    return Response.json({ error: 'Faltan los tiempos de respuesta por estímulo' }, { status: 400 })
  }

  const totalSeconds = typeof timeSeconds === 'number' && Number.isFinite(timeSeconds) && timeSeconds >= 0 ? Math.round(timeSeconds) : 0
  const averageSeconds = (firstResponseTimes as number[]).reduce((sum, value) => sum + value, 0) / 9
  const supabase = createSupabasePublicClient()
  if (!supabase) return Response.json({ error: 'Supabase no está configurado' }, { status: 503 })

  // El reloj de la base registra la confirmación antes de calcular el resultado.
  const { error: confirmationError } = await supabase.rpc('record_test_confirmation', { p_token: token })
  if (confirmationError) {
    return Response.json({ error: confirmationError.message.includes('LINK_INVALID') || confirmationError.message.includes('CONSENT_REQUIRED')
      ? 'El enlace o el consentimiento ya no está disponible'
      : 'No se pudo registrar la confirmación final. Intenta nuevamente.' }, { status: 400 })
  }

  const result = {
    ...calculateResult(rankings, userData as UserData, typeof timeSeconds === 'number' ? timeSeconds : undefined),
    thesis: { totalExecutionSeconds: totalSeconds, firstResponseTimes, averageResponseSeconds: averageSeconds },
  }

  const { error } = await supabase.rpc('complete_evaluation', {
    p_token: token,
    p_user_data: userData,
    p_slots: slots,
    p_rankings: rankings,
    p_result: result,
    p_started_at: startedAt,
    p_finished_at: new Date().toISOString(),
    p_total_seconds: totalSeconds,
    p_first_response_times: firstResponseTimes,
    p_average_response_seconds: averageSeconds,
  })
  if (error) return Response.json({ error: error.message.includes('REGISTRATION_REQUIRED')
    ? 'Completa tus datos personales antes de enviar la prueba.'
    : error.message.includes('LINK_INVALID') ? 'El enlace ya no está disponible' : error.message }, { status: 400 })
  return Response.json(result)
}
