/** Character data that never changes (images live in /public/characters/<slug>/). */

export type ReactionKey = 'happy' | 'cool' | 'surprised' | 'angry'

export const REACTION_KEYS: ReactionKey[] = ['happy', 'cool', 'surprised', 'angry']

export const REACTION_LABEL: Record<ReactionKey, string> = {
  happy: '웃겨',
  cool: '멋져',
  surprised: '헐',
  angry: '빡침',
}

type CharacterInfo = {
  prop?: string
  /** every expression file this character has, in sheet order */
  expressions: { file: string; label: string }[]
  /** which file shows each standard reaction for this character */
  reactionFile: Record<ReactionKey, string>
}

const STD = {
  expressions: [
    { file: 'happy', label: '웃음' },
    { file: 'cool', label: '멋짐' },
    { file: 'surprised', label: '놀람' },
    { file: 'angry', label: '빡침' },
  ],
  reactionFile: { happy: 'happy', cool: 'cool', surprised: 'surprised', angry: 'angry' },
}

export const CHARACTERS: Record<string, CharacterInfo> = {
  kimdonguk: {
    prop: '무한',
    expressions: [
      { file: 'happy', label: '웃음' },
      { file: 'cool', label: '여유' },
      { file: 'surprised', label: '놀람' },
      { file: 'peek', label: '살짝' },
      { file: 'angry', label: '빡침' },
    ],
    reactionFile: STD.reactionFile,
  },
  leejaeho: {
    prop: '참이슬 세트',
    expressions: [
      { file: 'happy', label: '웃음' },
      { file: 'drink', label: '짠' },
      { file: 'tipsy', label: '알딸딸' },
      { file: 'cool', label: '멋짐' },
      { file: 'fedup', label: '현타' },
    ],
    reactionFile: { happy: 'happy', cool: 'cool', surprised: 'tipsy', angry: 'fedup' },
  },
  chohyunjun: { prop: '라바콘', ...STD },
  parkminhoon: {
    prop: '꽃등심',
    expressions: [
      { file: 'happy', label: '웃음' },
      { file: 'mask', label: '마스크' },
      { file: 'surprised', label: '놀람' },
      { file: 'angry', label: '빡침' },
    ],
    reactionFile: { happy: 'happy', cool: 'mask', surprised: 'surprised', angry: 'angry' },
  },
  choiseungbin: { ...STD },
  kimchanghyun: { ...STD },
  kimdaehee: { ...STD },
  jangikjun: { ...STD },
}

/** 김동욱(운영자) 먼저, 나머지는 이름(가나다)순. Collection numbers and lists follow this. */
export const ORDER = ['kimdonguk', 'kimdaehee', 'kimchanghyun', 'parkminhoon', 'leejaeho', 'jangikjun', 'chohyunjun', 'choiseungbin']

/** Figure lineup (login / edition boxes): 김동욱 in the middle, others in name order around him. */
export const LINEUP = ['kimdaehee', 'kimchanghyun', 'parkminhoon', 'kimdonguk', 'leejaeho', 'jangikjun', 'chohyunjun', 'choiseungbin']

export const orderIndex = (slug: string) => ORDER.indexOf(slug)

const BASE = '/characters'

export const img = {
  profile: (slug: string) => `${BASE}/${slug}/profile.webp`,
  full: (slug: string) => `${BASE}/${slug}/full_body.webp`,
  icon: (slug: string) => (CHARACTERS[slug]?.prop ? `${BASE}/${slug}/icon.webp` : null),
  expression: (slug: string, file: string) => `${BASE}/${slug}/reactions/${file}.webp`,
  reaction: (slug: string, key: ReactionKey) =>
    `${BASE}/${slug}/reactions/${CHARACTERS[slug]?.reactionFile[key] ?? key}.webp`,
}
