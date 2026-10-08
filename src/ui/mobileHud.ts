export function createMobileHud() {
  const root = document.createElement('aside'); root.className = 'mobile-hud';
  const stats = document.createElement('div'); const boss = document.createElement('div');
  const notice = document.createElement('div'); notice.className = 'mobile-notice';
  notice.setAttribute('role', 'status');
  root.append(stats, boss, notice); document.body.prepend(root);
  let lastStats = '', lastBoss = '', expires = 0;
  return {
    update(summary: string, bossText: string, now: number) {
      if (summary !== lastStats) { stats.textContent = summary; lastStats = summary; }
      if (bossText !== lastBoss) { boss.textContent = bossText; lastBoss = bossText; }
      if (expires && now >= expires) { notice.textContent = ''; expires = 0; }
    },
    hit(message: string, now: number) { notice.textContent = message; expires = now + 1400; },
    destroy() { root.remove(); }
  };
}
