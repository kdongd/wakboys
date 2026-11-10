import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { useErrorToast, useToast } from '../components/Toast'
import { Avatar, Back, confirmAsk, Name, Spinner } from '../components/ui'
import type { Member } from '../types'

type AdminMember = { member: Member; linked: boolean; inviteCode?: string; linkedAt?: string }

export default function Admin() {
  const { me, reload } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const err = useErrorToast()
  const q = useQuery({ queryKey: ['admin-members'], queryFn: () => api.get<AdminMember[]>('/api/admin/members'), enabled: !!me?.member.admin })
  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-members'] })
    qc.invalidateQueries({ queryKey: ['members'] })
  }
  const treasurer = useMutation({
    mutationFn: (v: { id: number; value: boolean }) => api.post(`/api/admin/members/${v.id}/treasurer`, { value: v.value }),
    onSuccess: async () => { done(); await reload() },
    onError: err,
  })
  const unlink = useMutation({ mutationFn: (id: number) => api.post(`/api/admin/members/${id}/unlink`), onSuccess: () => { done(); toast('연결을 해제했어요. 새 코드를 전달해주세요') }, onError: err })
  const regen = useMutation({ mutationFn: (id: number) => api.post(`/api/admin/members/${id}/invite-code`), onSuccess: () => { done(); toast('새 코드를 만들었어요') }, onError: err })

  if (!me?.member.admin) return <Navigate to="/" replace />

  const copy = (m: AdminMember) => {
    const text = `[와크보이즈] ${m.member.name} 전용 초대 코드: ${m.inviteCode}\n${window.location.origin} 에서 카카오 로그인 후 입력하세요`
    navigator.clipboard?.writeText(text).then(() => toast(`${m.member.name} 초대 메시지를 복사했어요`))
  }

  return (
    <div className="page no-tab">
      <Back label="뒤로" />
      <div className="title mt8">운영자</div>
      <div className="small muted bold mt8">초대 코드는 사람마다 하나씩, 각자 개인톡으로 보내주세요. 한 번 쓰면 사라져요.</div>
      <div className="mt16">
        {!q.data ? (
          <Spinner />
        ) : (
          q.data.map((a) => (
            <div key={a.member.id} className="card">
              <div className="row">
                <Avatar m={a.member} size={40} gray={!a.linked} />
                <div className="grow">
                  <Name m={a.member} />
                  <div className="small bold" style={{ color: a.linked ? 'var(--green)' : 'var(--brown)' }}>
                    {a.linked ? `가입 완료${a.linkedAt ? ' · ' + new Date(a.linkedAt).toLocaleDateString('ko-KR') : ''}` : '미가입'}
                  </div>
                </div>
                {!a.member.admin && (
                  <button
                    className={'chip' + (a.member.treasurer ? ' on' : '')}
                    onClick={() => treasurer.mutate({ id: a.member.id, value: !a.member.treasurer })}
                  >
                    {a.member.treasurer ? '총무 ✓' : '총무 지정'}
                  </button>
                )}
              </div>
              {!a.linked && a.inviteCode && (
                <div className="row mt12">
                  <span className="code grow" style={{ fontSize: 18 }}>{a.inviteCode}</span>
                  <button className="chip on" onClick={() => copy(a)}>복사</button>
                  <button className="chip" onClick={() => confirmAsk('코드를 새로 만들까요? 이전 코드는 못 쓰게 돼요') && regen.mutate(a.member.id)}>재발급</button>
                </div>
              )}
              {a.linked && !a.member.admin && (
                <button className="small muted bold mt12" onClick={() => confirmAsk(`${a.member.name}의 카카오 연결을 해제할까요? 기록은 캐릭터에 그대로 남고, 새 초대 코드가 만들어져요.`) && unlink.mutate(a.member.id)}>
                  카카오 연결 해제
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
