import { useMutation } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../auth'
import { img, REACTION_KEYS, REACTION_LABEL, type ReactionKey } from '../members'
import type { Social } from '../types'
import { useMembers } from '../useMembers'
import { useErrorToast } from './Toast'

/**
 * Four buttons, each showing MY character's face for that reaction.
 * Tapping the active one again removes it.
 */
export function ReactionBar({ type, id, social, onChange }: {
  type: 'MEDIA' | 'POST'
  id: number
  social: Social
  onChange: (s: Social) => void
}) {
  const { me } = useAuth()
  const err = useErrorToast()
  const m = useMutation({
    mutationFn: (reaction: string | null) => api.put<Social>('/api/reactions', { type, id, reaction }),
    onSuccess: onChange,
    onError: err,
  })
  if (!me) return null
  const slug = me.member.slug
  return (
    <div className="rx-bar">
      {REACTION_KEYS.map((k) => (
        <button
          key={k}
          className={'rx-btn' + (social.mine === k ? ' on' : '')}
          disabled={m.isPending}
          onClick={() => m.mutate(social.mine === k ? null : k)}
        >
          <img src={img.reaction(slug, k)} alt="" />
          {REACTION_LABEL[k]}
        </button>
      ))}
    </div>
  )
}

/** Overlapping faces of everyone who reacted, each with their own expression. */
export function ReactionStack({ social, max = 6, size = 26 }: { social: Social; max?: number; size?: number }) {
  const { byId } = useMembers()
  if (social.reactions.length === 0) return null
  const shown = social.reactions.slice(0, max)
  return (
    <div className="rx-stack">
      {shown.map((r) => {
        const m = byId.get(r.memberId)
        if (!m) return null
        return (
          <img
            key={r.memberId}
            src={img.reaction(m.slug, r.reaction as ReactionKey)}
            alt={m.name}
            title={`${m.name} · ${REACTION_LABEL[r.reaction as ReactionKey] ?? r.reaction}`}
            style={{ width: size, height: size }}
          />
        )
      })}
      {social.reactions.length > max && <span className="small bold muted" style={{ marginLeft: 4 }}>+{social.reactions.length - max}</span>}
    </div>
  )
}
