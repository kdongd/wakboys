import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { Member, MemberCard } from './types'

/** All 8 members, cached for the session (they barely change). */
export function useMembers() {
  const q = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get<MemberCard[]>('/api/members'),
    staleTime: 5 * 60_000,
  })
  const list = q.data ?? []
  const byId = new Map<number, Member>(list.map((c) => [c.member.id, c.member]))
  return { cards: list, members: list.map((c) => c.member), byId, isLoading: q.isLoading }
}
