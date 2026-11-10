export type Member = {
  id: number
  slug: string
  name: string
  themeColor: string
  treasurer: boolean
  admin: boolean
}

export type MemberCard = { member: Member; linked: boolean; birthMonth?: number; birthDay?: number }

export type Social = {
  commentCount: number
  reactions: { memberId: number; reaction: string }[]
  mine?: string
}

export type MediaItem = {
  id: number
  tripId?: number
  postId?: number
  kind: 'PHOTO' | 'VIDEO'
  url: string
  thumbUrl?: string
  width?: number
  height?: number
  durationSec?: number
  uploader: Member
  createdAt: string
  social: Social
}

export type Trip = {
  id: number
  year: number
  season: 'SUMMER' | 'WINTER'
  title: string
  destination?: string
  startDate?: string
  endDate?: string
  edition: number
  status: 'TBD' | 'UPCOMING' | 'ONGOING' | 'DONE'
  dday?: number
  mediaCount: number
  coverThumbs: string[]
  receiver?: Member
}

export type Progress = { done: number; total: number }

export type TripDetail = {
  trip: Trip
  openPolls: number
  itineraryCount: number
  placeCount: number
  checklist: Progress
  expenseTotal: number
}

export type Poll = {
  id: number
  tripId: number
  category: 'DESTINATION' | 'DATE' | 'STAY' | 'ETC'
  question: string
  multiple: boolean
  closesAt?: string
  open: boolean
  createdBy?: Member
  options: { id: number; label: string; voterIds: number[] }[]
  myOptionIds: number[]
  voterCount: number
  leadingOptionIds: number[]
}

export type ItineraryItem = { id: number; dayNo: number; startTime?: string; title: string; memo?: string }

export type Place = {
  id: number
  name: string
  category: string
  address?: string
  url?: string
  memo?: string
  lat?: number
  lng?: number
  visited: boolean
  createdBy?: Member
}

export type ChecklistItem = {
  id: number
  title: string
  kind: 'SHARED' | 'EACH'
  assignee?: Member
  done: boolean
  doneBy?: Member
  checkedMemberIds: number[]
  mine: boolean
}

export type Settlement = {
  receiver?: Member
  bankInfo?: string
  total: number
  share: number
  headcount: number
  expenses: { id: number; title: string; amount: number; paidBy: Member; createdBy?: Member; createdAt: string }[]
  members: { member: Member; paid: number; share: number; net: number }[]
  transfers: { from: Member; to: Member; amount: number; sent: boolean; sentAt?: string; sentAmount?: number; changed: boolean }[]
  sentCount: number
}

export type DuesOverview = {
  config: { monthlyAmount: number; initialBalance: number; bankInfo?: string; startYm: string }
  balance: number
  monthIncome: number
  monthExpense: number
  currentYm: string
  months: string[]
  members: Member[]
  payments: { memberId: number; ym: string; amount: number }[]
  expenses: { id: number; title: string; amount: number; spentOn: string; createdBy?: Member }[]
}

export type Post = {
  id: number
  author: Member
  body: string
  createdAt: string
  edited: boolean
  media: MediaItem[]
  social: Social
}

export type Comment = { id: number; author: Member; body: string; createdAt: string }

export type Home = {
  nextTrip?: { trip: Trip; openPolls: number; checklist: Progress }
  dues: { ym: string; monthlyAmount: number; paid: Member[]; unpaid: Member[] }
  shelf: Trip[]
  memories?: { trip: Trip; media: MediaItem[] }
  birthdays: { member: Member; month: number; day: number; dday: number }[]
  posts: Post[]
}
