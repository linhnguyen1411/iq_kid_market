/** Friendly SEO paths (Vietnamese slugs). */
export const paths = {
  home: '/',
  marketplace: '/cho-game',
  scratch: '/scratch',
  leaderboard: '/bang-vang',
  wallet: '/vi-xu',
  profile: '/ho-so',
  studio: '/studio',
  play: (gameId: string, level = 1) =>
    `/choi/${encodeURIComponent(gameId)}${level > 1 ? `?man=${level}` : ''}`,
  admin: {
    root: '/admin',
    users: '/admin/nguoi-dung',
    games: '/admin/kho-game',
    categories: '/admin/the-loai',
  },
} as const;

export const pageTitles: Record<string, string> = {
  [paths.home]: 'Khám phá — IQ Kids Market',
  [paths.marketplace]: 'Chợ Game Trí Tuệ — IQ Kids Market',
  [paths.scratch]: 'Lập trình Scratch — IQ Kids Market',
  [paths.leaderboard]: 'Bảng Vàng — IQ Kids Market',
  [paths.wallet]: 'Ví Xu — IQ Kids Market',
  [paths.profile]: 'Hồ sơ — IQ Kids Market',
  [paths.studio]: 'Studio Sáng Tạo — IQ Kids Market',
  [paths.admin.root]: 'CMS Dashboard — IQ Kids Market',
  [paths.admin.users]: 'Quản trị người dùng — IQ Kids Market',
  [paths.admin.games]: 'Kho game & kiểm duyệt — IQ Kids Market',
  [paths.admin.categories]: 'Quản lý thể loại game — IQ Kids Market',
};

export function titleForPath(pathname: string): string {
  if (pathname.startsWith('/choi/')) return 'Chơi game — IQ Kids Market';
  return pageTitles[pathname] || 'IQ Kids Market — Sàn Đấu Trí Tuệ & Lập Trình Cho Bé';
}
