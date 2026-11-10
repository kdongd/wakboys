import { Link } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { img, orderIndex } from '../members'
import { useMembers } from '../useMembers'

export default function Collection() {
  const { cards, isLoading } = useMembers()
  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="eyebrow">COLLECTION</div>
          <div className="title">컬렉션</div>
        </div>
        <span className="chip" style={{ background: '#fff' }}>{cards.filter((c) => c.linked).length} / 8 수집</span>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[...cards].sort((a, b) => orderIndex(a.member.slug) - orderIndex(b.member.slug)).map(({ member: m, linked }, i) => (
            <Link key={m.id} to={`/members/${m.slug}`} className="box" style={{ height: 250, background: `linear-gradient(170deg, ${m.themeColor}, ${m.themeColor}cc 60%, #191b22 140%)` }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: '#191b22', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', zIndex: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 900 }}>No.{String(i + 1).padStart(2, '0')} {m.name}</span>
                {m.admin ? <span className="badge admin">운영자</span> : m.treasurer ? <span className="badge" style={{ background: '#fff', color: '#191b22' }}>총무</span> : null}
              </div>
              <div className="window" style={{ left: 10, right: 10, top: 50, bottom: 10, opacity: linked ? 1 : 0.85 }}>
                <img src={img.full(m.slug)} alt={m.name} style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', height: '90%', filter: linked ? undefined : 'grayscale(.9)', opacity: linked ? 1 : 0.6 }} />
                <div className="gloss" />
                {!linked && <span className="chip" style={{ position: 'absolute', top: 8, left: 8, zIndex: 4 }}>미개봉</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
