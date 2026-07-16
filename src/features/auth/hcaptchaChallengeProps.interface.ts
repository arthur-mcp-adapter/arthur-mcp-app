export interface HcaptchaChallengeProps {
  onTokenChange: (token: string | null) => void
  resetKey: number
}
