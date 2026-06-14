import { NextRequest } from 'next/server'
import { calculateResult, slotsToRankings, UserData } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  let body: { slots: unknown; userData: unknown; timeSeconds?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { slots, userData, timeSeconds } = body

  if (!Array.isArray(slots) || slots.length !== 9) {
    return Response.json({ error: 'slots debe ser un array de 9 elementos' }, { status: 400 })
  }

  const rankings = slotsToRankings(slots as (number | null)[])
  if (!rankings) {
    return Response.json({ error: 'Todos los slots deben estar completos' }, { status: 400 })
  }

  const result = calculateResult(
    rankings,
    userData as UserData,
    typeof timeSeconds === 'number' ? timeSeconds : undefined,
  )

  return Response.json(result)
}
