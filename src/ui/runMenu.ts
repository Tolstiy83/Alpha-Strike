export interface MenuAction { label: string; run: () => void; disabled?: boolean }
/** DOM controls remain responsive while Phaser's whole scene is paused. */
export function showRunMenu(title: string, detail: string, actions: MenuAction[], shortcut?: (key: string) => void) {
  const overlay = document.createElement('div'); overlay.className = 'run-menu';
  const panel = document.createElement('section'); panel.className = 'run-menu-panel';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', title);
  const heading = document.createElement('h1'); heading.textContent = title;
  const text = document.createElement('p'); text.textContent = detail;
  panel.append(heading, text);
  for (const action of actions) {
    const button = document.createElement('button'); button.textContent = action.label;
    button.disabled = action.disabled ?? false; button.onclick = action.run; panel.append(button);
  }
  overlay.append(panel); document.body.append(overlay);
  const keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      const buttons = [...panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    } else if (event.key !== 'Enter' && event.key !== ' ') {
      event.preventDefault(); if (!event.repeat) shortcut?.(event.key.toLowerCase());
    }
    event.stopImmediatePropagation();
  };
  document.addEventListener('keydown', keyHandler, true);
  panel.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  return () => { document.removeEventListener('keydown', keyHandler, true); overlay.remove(); };
}
