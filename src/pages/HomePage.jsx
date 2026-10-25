import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataNotice from '../components/DataNotice.jsx'
import ItemCard from '../components/ItemCard.jsx'
import { loadData } from '../data/store.js'

export default function HomePage() {
  // 화면을 열 때마다 DB에서 목록을 불러온다. 불러오는 동안 data는 null.
  const [data, setData] = useState(null)

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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      {/* 홈 화면 상단: 서비스 소개 + 기부자/기관 진입 버튼 */}
      <section className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-800">
          기부자·기관 프로필과 크레딧으로 잇는 나눔 자동 매칭
        </h1>
        <p className="mt-3 text-black/60 max-w-2xl mx-auto text-sm sm:text-base">
          기부하고 싶은 물건의 정보를 입력하면 그 물건을 필요로 하는 기관을 찾아드리고,
          기관은 필요한 물품 조건을 입력해 현재 등록된 기부 물품을 확인할 수 있어요.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/donor"
            className="w-full sm:w-64 rounded-xl bg-brand-600 px-6 py-4 text-white font-semibold shadow-sm hover:bg-brand-700 transition-colors"
          >
            기부자로 시작하기
            <span className="block text-xs font-normal text-brand-100 mt-1">
              나눌 물건을 등록하고 매칭받기
            </span>
          </Link>
          <Link
            to="/institution"
            className="w-full sm:w-64 rounded-xl bg-accent-500 px-6 py-4 text-white font-semibold shadow-sm hover:bg-accent-600 transition-colors"
          >
            기관으로 시작하기
            <span className="block text-xs font-normal text-white/85 mt-1">
              필요한 물품 조건 등록하고 찾기
            </span>
          </Link>
        </div>
      </section>

      {/* 홈 화면 하단: 기부자 등록 물품 / 기관 필요 물품 목록 (기획안 홈 화면 스케치 반영) */}
      {data && (
        <div className="mt-10">
          <DataNotice source={data.source} error={data.error} />
        </div>
      )}

      <section className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-800">데이터베이스 내 기부자 등록 물품</h2>
            <Link to="/donor" className="text-xs text-brand-500 hover:underline">
              더 보기
            </Link>
          </div>
          {!data && <p className="text-sm text-black/45">불러오는 중…</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-3">
            {donorItems.map((item) => (
              <ItemCard
                key={item.id}
                categories={item.categories}
                title={item.title}
                quantity={item.quantity}
                meta={item.condition}
                owner={{ name: item.donor, avatar: item.donorAvatar }}
                tone="brand"
                showPhoto
                photo={item.photo}
                availableUntil={item.availableUntil}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-800">데이터베이스 내 기관 필요 물품</h2>
            <Link to="/institution" className="text-xs text-brand-500 hover:underline">
              더 보기
            </Link>
          </div>
          {!data && <p className="text-sm text-black/45">불러오는 중…</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-3">
            {institutionNeeds.map((need) => (
              <ItemCard
                key={need.id}
                categories={need.categories}
                title={need.title}
                quantity={need.quantity}
                owner={{ name: need.org, avatar: need.orgAvatar }}
                tone="accent"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
