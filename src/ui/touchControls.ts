import type { StageBonus } from '../data/campaign';

export function createTouchControls(options: {
  position: () => number;
  move: (x?: number) => void;
  state: () => { blocked: boolean; choosing: boolean; selected?: StageBonus };
  pause: () => void;
  bonus: (bonus: StageBonus) => void;
  next: () => void;
  unlockAudio: () => void;
}) {
  const root = document.createElement('div'); root.className = 'touch-controls';
  const pause = document.createElement('button'); pause.textContent = 'Pause';
  const pad = document.createElement('div'); pad.className = 'touch-pad';
  pad.textContent = '↔ Drag to move • Auto-fire';
  const rewards = document.createElement('div'); rewards.className = 'touch-rewards';
  const choices: StageBonus[] = ['fire-rate', 'troop', 'damage'];
  const buttons = choices.map((choice, index) => {
    const button = document.createElement('button');
    button.textContent = ['+10% fire rate', '+1 troop', '+1 damage'][index];
    button.onclick = () => { options.bonus(choice); refresh(); };
    rewards.append(button); return button;
  });
  const next = document.createElement('button'); next.textContent = 'Continue';
  next.onclick = options.next;
  root.append(pause, pad, rewards, next); document.body.append(root);
  let pointer: number | undefined;
  let lastX = 0;
  let target = 0;
  const reset = () => {
    const previous = pointer; pointer = undefined;
    if (previous !== undefined && pad.hasPointerCapture(previous)) pad.releasePointerCapture(previous);
    options.move(); pad.classList.remove('dragging');
  };
  pause.onclick = () => { reset(); options.pause(); };
  pad.onpointerdown = event => {
    const state = options.state();
    if (pointer !== undefined || state.blocked || state.choosing || event.button !== 0) return;
    event.preventDefault(); options.unlockAudio();
    pointer = event.pointerId; lastX = event.clientX; target = options.position();
    pad.setPointerCapture(pointer); pad.classList.add('dragging');
  };
  pad.onpointermove = event => {
    if (event.pointerId !== pointer) return;
    const state = options.state();
    if (state.blocked || state.choosing) { reset(); return; }
    const width = pad.getBoundingClientRect().width;
    if (!width) return;
    target = Math.max(24, Math.min(776, target + (event.clientX - lastX) * 800 / width));
    lastX = event.clientX; options.move(target);
  };
  const release = (event: PointerEvent) => { if (event.pointerId === pointer) reset(); };
  pad.onpointerup = release; pad.onpointercancel = release; pad.onlostpointercapture = release;
  window.addEventListener('blur', reset); window.addEventListener('resize', reset);
  let lastState = "";
  const refresh = () => {
    const state = options.state();
    const signature = [state.blocked, state.choosing, state.selected].join(':');
    if (signature === lastState) return;
    lastState = signature;
    pad.hidden = state.choosing; pause.hidden = state.choosing;
    rewards.hidden = !state.choosing; next.hidden = !state.choosing;
    next.disabled = !state.selected;
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(state.selected === choices[index])));
    if (state.blocked || state.choosing) reset();
  };
  refresh();
  return { reset, refresh, destroy() {
    reset(); window.removeEventListener('blur', reset); window.removeEventListener('resize', reset); root.remove();
  } };
}
