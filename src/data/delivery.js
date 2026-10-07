// 물품 전달 방법과, 매칭 결과에 보여줄 기부 방법(기부자용)·수령 방법(기관용) 안내 문구.
// 기부자는 "가능한 전달 방법", 기관은 "받을 수 있는 방법"을 고르고,
// 둘 다 가능한 방법만 안내한다.

export const DELIVERY_METHODS = [
  {
    id: 'dropoff',
    label: '직접 전달',
    donorHint: '내가 기관에 직접 가져다줄 수 있어요',
    orgHint: '기부자가 기관으로 가져오면 받아요',
  },
  {
    id: 'parcel',
    label: '택배',
    donorHint: '택배로 보낼 수 있어요',
    orgHint: '택배로 받을 수 있어요',
  },
  {
    id: 'pickup',
    label: '방문 수거',
    donorHint: '기관이 와서 가져가 주면 좋아요',
    orgHint: '기관이 기부자에게 가서 가져올 수 있어요',
  },
]

export function methodLabel(id) {
  return DELIVERY_METHODS.find((m) => m.id === id)?.label ?? id
}

/** 기부자와 기관이 모두 가능한 전달 방법 (DELIVERY_METHODS 순서 유지) */
export function commonMethods(donorMethods, orgMethods) {
  return DELIVERY_METHODS.map((m) => m.id).filter((id) => donorMethods.includes(id) && orgMethods.includes(id))
}

/**
 * 기부자에게 보여줄 기부 방법 안내.
 * @returns {{ method: string, lines: string[] }[]} 가능한 방법이 없으면 빈 배열
 */
export function donationGuide(donor, institution) {
  return commonMethods(donor.methods, institution.methods).map((id) => {
    if (id === 'dropoff') {
      return {
        method: methodLabel(id),
        lines: [
          `주소: ${institution.location}`,
          institution.hours ? `방문 가능 시간: ${institution.hours}` : '방문 전에 기관에 연락해 시간을 맞춰 주세요.',
          `문의: ${institution.phone}`,
        ],
      }
    }
    if (id === 'parcel') {
      return {
        method: methodLabel(id),
        lines: [
          `받는 곳: ${institution.name}`,
          `주소: ${institution.location}`,
          `연락처: ${institution.phone}`,
        ],
      }
    }
    return {
      method: methodLabel(id),
      lines: [
        `${institution.name}에서 기부자님 지역(${donor.region})으로 찾아가 물품을 가져가요.`,
        '매칭이 확정되면 기관에서 일정을 연락드려요.',
      ],
    }
  })
}

/**
 * 기관에게 보여줄 수령 방법 안내.
 * 기부자 연락처는 매칭 확정 전에는 보여주지 않는다.
 */
export function receiveGuide(item, institution) {
  return commonMethods(item.methods, institution.methods).map((id) => {
    if (id === 'dropoff') {
      return {
        method: methodLabel(id),
        lines: [`기부자가 기관 주소(${institution.location})로 직접 가져다줘요.`],
      }
    }
    if (id === 'parcel') {
      return {
        method: methodLabel(id),
        lines: [`기부자가 기관 주소(${institution.location})로 택배를 보내요.`],
      }
    }
    return {
      method: methodLabel(id),
      lines: [`기부자 지역: ${item.region}`, '기관에서 기부자에게 찾아가 물품을 가져와요.'],
    }
  })
}
