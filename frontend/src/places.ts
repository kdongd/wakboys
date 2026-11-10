/** Popular domestic destinations, used to place a trip on the map from its 여행지 text. */
export type KnownPlace = { name: string; lat: number; lng: number }

export const KNOWN_PLACES: KnownPlace[] = [
  { name: '서울', lat: 37.5665, lng: 126.978 },
  { name: '인천', lat: 37.4563, lng: 126.7052 },
  { name: '강화', lat: 37.7469, lng: 126.4878 },
  { name: '가평', lat: 37.8315, lng: 127.5105 },
  { name: '양평', lat: 37.4917, lng: 127.4875 },
  { name: '춘천', lat: 37.8813, lng: 127.7298 },
  { name: '홍천', lat: 37.697, lng: 127.8888 },
  { name: '원주', lat: 37.3422, lng: 127.9202 },
  { name: '평창', lat: 37.3705, lng: 128.39 },
  { name: '용평', lat: 37.6439, lng: 128.68 },
  { name: '대관령', lat: 37.687, lng: 128.718 },
  { name: '정선', lat: 37.3807, lng: 128.6608 },
  { name: '하이원', lat: 37.207, lng: 128.837 },
  { name: '강릉', lat: 37.7519, lng: 128.8761 },
  { name: '속초', lat: 38.207, lng: 128.5918 },
  { name: '양양', lat: 38.0754, lng: 128.6191 },
  { name: '동해', lat: 37.5247, lng: 129.1143 },
  { name: '삼척', lat: 37.4499, lng: 129.1652 },
  { name: '태안', lat: 36.7456, lng: 126.2979 },
  { name: '대천', lat: 36.33, lng: 126.59 },
  { name: '보령', lat: 36.3333, lng: 126.6127 },
  { name: '대전', lat: 36.3504, lng: 127.3845 },
  { name: '공주', lat: 36.4465, lng: 127.119 },
  { name: '부여', lat: 36.2757, lng: 126.9098 },
  { name: '단양', lat: 36.9846, lng: 128.3655 },
  { name: '제천', lat: 37.1326, lng: 128.191 },
  { name: '안동', lat: 36.5684, lng: 128.7294 },
  { name: '경주', lat: 35.8562, lng: 129.2247 },
  { name: '포항', lat: 36.019, lng: 129.3435 },
  { name: '울진', lat: 36.993, lng: 129.4004 },
  { name: '울릉', lat: 37.4844, lng: 130.9057 },
  { name: '대구', lat: 35.8714, lng: 128.6014 },
  { name: '전주', lat: 35.8242, lng: 127.148 },
  { name: '군산', lat: 35.9676, lng: 126.7369 },
  { name: '무주', lat: 35.9079, lng: 127.6608 },
  { name: '광주', lat: 35.1595, lng: 126.8526 },
  { name: '담양', lat: 35.3211, lng: 126.9882 },
  { name: '목포', lat: 34.8118, lng: 126.3922 },
  { name: '여수', lat: 34.7604, lng: 127.6622 },
  { name: '순천', lat: 34.9506, lng: 127.4872 },
  { name: '보성', lat: 34.7715, lng: 127.08 },
  { name: '완도', lat: 34.311, lng: 126.7551 },
  { name: '진도', lat: 34.4868, lng: 126.2635 },
  { name: '해운대', lat: 35.1587, lng: 129.1604 },
  { name: '광안리', lat: 35.1532, lng: 129.1186 },
  { name: '부산', lat: 35.1796, lng: 129.0756 },
  { name: '울산', lat: 35.5384, lng: 129.3114 },
  { name: '거제', lat: 34.8806, lng: 128.6211 },
  { name: '통영', lat: 34.8544, lng: 128.4331 },
  { name: '남해', lat: 34.8376, lng: 127.8924 },
  { name: '창원', lat: 35.2281, lng: 128.6811 },
  { name: '진주', lat: 35.18, lng: 128.1076 },
  { name: '서귀포', lat: 33.2541, lng: 126.5601 },
  { name: '우도', lat: 33.5064, lng: 126.9531 },
  { name: '제주', lat: 33.4996, lng: 126.5312 },
]

const BY_LENGTH = [...KNOWN_PLACES].sort((a, b) => b.name.length - a.name.length)

/** Finds a known place mentioned in the text (longest name wins, e.g. 해운대 before 부산). */
export function guessPlace(...texts: (string | undefined)[]): KnownPlace | null {
  const t = texts.filter(Boolean).join(' ')
  if (!t) return null
  return BY_LENGTH.find((p) => t.includes(p.name)) ?? null
}
