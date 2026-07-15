import type { UserProfile } from './userProfile.interface'

export interface MyProfileTabProps { me: UserProfile; onUpdated: (u: UserProfile) => void }
