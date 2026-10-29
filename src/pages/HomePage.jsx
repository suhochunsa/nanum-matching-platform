import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataNotice from '../components/DataNotice.jsx'
import ItemCard from '../components/ItemCard.jsx'
import { buttonClass } from '../components/ui.js'
import { CATEGORY_TREE, parentOf } from '../data/categories.js'
import { isExpired } from '../data/dates.js'
import { loadData } from '../data/store.js'
import { useAuth } from '../lib/authContext.js'

const PAGE_SIZE = 9

const STEPS = [
  ['물품 등록', '기부자는 사진·범주·수량·상태·기부 가능 기간을, 기관은 필요한 물품과 수량을 입력해요.'],
  ['자동 매칭', '범주 일치, 이름 유사도, 수량 충족률, 물품 상태를 합친 점수로 잘 맞는 상대를 순서대로 찾아요.'],
  ['기부 방법 안내', '직접 전달·택배·방문 수거 중 양쪽이 모두 가능한 방법으로 주소와 연락처까지 알려줘요.'],
]

/** 회색 트랙 위에 흰 알약이 올라오는 전환 버튼 (기부 물품 / 필요 물품) */
function Segmented({ value, onChange, options }) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-canvas-soft p-1">
      {options.map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            value === key ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {label}
          <span className="ml-1.5 tabular-nums text-faint">{count}</span>
        </button>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { profile } = useAuth()
  // 화면을 열 때마다 DB에서 목록을 불러온다. 불러오는 동안 data는 null.
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('items') // 'items' | 'needs'
  const [category, setCategory] = useState('') // '' = 전체, 아니면 큰 범주 이름
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    let cancelled = false
    loadData().then((d) => {
      if (!cancelled) setData(d)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const donorItems = data?.donorItems ?? []
  const institutionNeeds = data?.institutionNeeds ?? []
  const list = tab === 'items' ? donorItems : institutionNeeds
  const q = query.trim().toLowerCase()
  const filtered = list.filter(
    (x) =>
      (!category || x.categories.some((leaf) => parentOf(leaf) === category)) &&
      (!q || x.title.toLowerCase().includes(q)),
  )

  // 탭·범주·검색어가 바뀌면 처음 9개부터 다시 보여준다.
  function resetPaging(fn) {
    return (v) => {
      fn(v)
      setVisible(PAGE_SIZE)
    }
  }

  const stats = [
    ['기부 가능한 물품', donorItems.filter((i) => !isExpired(i.availableUntil)).length],
    ['모집 중인 필요 물품', institutionNeeds.length],
    ['참여 기관', data?.institutions.length ?? 0],
  ]

  const primaryAction = !profile
    ? ['/login', '로그인하고 시작하기']
    : profile.role === 'donor'
      ? ['/donor', '기부 물품 등록하기']
      : ['/institution', '필요 물품 등록하기']

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* 소개 */}
      <section className="pt-16 pb-14 text-center sm:pt-24">
        <p className="inline-flex rounded-full bg-canvas-soft px-3 py-1 text-xs font-semibold text-muted">
          기부자 · 기관 자동 매칭
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-display leading-[1.05] text-ink sm:text-6xl">
          남는 물건을
          <br />
          필요한 곳으로.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-muted sm:text-xl">
          물건 정보를 입력하면 그 물건을 찾는 기관을, 필요한 물품을 입력하면 지금 기부 가능한 물품을 바로 찾아드려요.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
          <Link to={primaryAction[0]} className={buttonClass('primary', 'lg')}>
            {primaryAction[1]}
          </Link>
          <a href="#list" className={buttonClass('soft', 'lg')}>
            물품 둘러보기
          </a>
        </div>
      </section>

      {/* 숫자로 보는 현황 */}
      <section aria-label="현황" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-3xl bg-canvas-soft px-6 py-7">
            <p className="text-5xl font-display leading-none tabular-nums text-ink">{data ? n : '–'}</p>
            <p className="mt-3 text-sm text-muted">{label}</p>
          </div>
        ))}
      </section>

      {/* 이용 방법 (실제 순서가 있는 단계라 번호를 붙인다) */}
      <section className="mt-24">
        <h2 className="text-3xl font-display leading-tight text-ink sm:text-4xl">이렇게 연결돼요.</h2>
        <ol className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="rounded-3xl border border-hairline-soft p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-[30%] bg-ink text-sm font-display text-white">
                {i + 1}
              </span>
              <p className="mt-5 text-lg font-display text-ink">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 목록 */}
      <section id="list" className="mt-24 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-display leading-tight text-ink sm:text-4xl">지금 등록된 물품.</h2>
          <Segmented
            value={tab}
            onChange={resetPaging(setTab)}
            options={[
              ['items', '기부 물품', donorItems.length],
              ['needs', '기관 필요 물품', institutionNeeds.length],
            ]}
          />
        </div>

        {data && (
          <div className="mt-6">
            <DataNotice source={data.source} error={data.error} />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5" aria-label="범주로 거르기">
            {['', ...CATEGORY_TREE.map((g) => g.name)].map((name) => (
              <button
                key={name || 'all'}
                type="button"
                aria-pressed={category === name}
                onClick={() => resetPaging(setCategory)(name)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  category === name ? 'bg-ink text-white' : 'bg-canvas-soft text-ink hover:bg-field'
                }`}
              >
                {name || '전체'}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => resetPaging(setQuery)(e.target.value)}
            placeholder="물품 이름으로 찾기"
            aria-label="물품 이름으로 찾기"
            className="h-10 w-full rounded-full bg-field px-4 text-sm text-ink placeholder:text-faint outline-none focus:ring-2 focus:ring-ink md:w-64"
          />
        </div>

        {!data && <p className="mt-8 text-sm text-muted">불러오는 중…</p>}

        {data && filtered.length === 0 && (
          <div className="mt-6 rounded-3xl bg-canvas-soft px-6 py-12 text-center text-muted">조건에 맞는 물품이 없어요.</div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, visible).map((x) =>
            tab === 'items' ? (
              <ItemCard
                key={x.id}
                categories={x.categories}
                title={x.title}
                quantity={x.quantity}
                meta={x.condition}
                owner={{ name: x.donor, avatar: x.donorAvatar }}
                showPhoto
                photo={x.photo}
                availableUntil={x.availableUntil}
              />
            ) : (
              <ItemCard
                key={x.id}
                categories={x.categories}
                title={x.title}
                quantity={x.quantity}
                owner={{ name: x.org, avatar: x.orgAvatar }}
              />
            ),
          )}
        </div>

        {filtered.length > visible && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className={buttonClass('outline', 'md')}>
              더 보기 ({filtered.length - visible}개 남음)
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
