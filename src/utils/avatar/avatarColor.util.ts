export function avatarColor(username: string) {
  const colors = ['#5D87FF', '#49BEFF', '#13DEB9', '#FFAE1F', '#FA896B']
  return colors[username.charCodeAt(0) % colors.length]
}
