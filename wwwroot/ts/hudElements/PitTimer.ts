import {Hide, HudElementWithHideDelay} from './HudElement.js';
import {NA, valueIsValidAssertUndefined} from '../consts.js';
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class PitTimer extends HudElementWithHideDelay {
  override sharedMemoryKeys: SharedMemoryKey[] = ['pitTotalDuration', 'pitElapsedTime'];

  private lastValidTotal: number = null;

  private static getTimeString(remaining: number | string, total: number) {
    return `${remaining}s/${total.toFixed(1)}s`;
  }

  protected override render(total: number, elapsed: number): string | Hide {
    if (!valueIsValidAssertUndefined(total) || total == 0)
      return this.lastValidTotal == null ? this.hide(NA) : this.hide(PitTimer.getTimeString(0, this.lastValidTotal));
    this.lastValidTotal = total;

    if (!valueIsValidAssertUndefined(elapsed))
      return this.hide(PitTimer.getTimeString(0, total));

    const remaining = Math.min(Math.ceil(total - elapsed), Math.floor(total));
    if (remaining < 0) return this.hide(PitTimer.getTimeString(0, total));

    return PitTimer.getTimeString(remaining, total);
  }
}
