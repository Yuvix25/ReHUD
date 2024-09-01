import HudElement, {Hide} from "./HudElement.js";
import {laptimeFormat, valueIsValidAssertUndefined, validNumberOrDefault, nameFormat, getClassColors, POSITION_BAR_CELL_COUNT} from "../consts.js";
import {EFinishStatus, ESession, IDriverData, ISectors} from "../r3eTypes.js";
import {Driver, getUid} from "../utils.js";
import SettingsValue from "../SettingsValue.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class PositionBar extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['driverData', 'position', 'sessionType', 'sectorTimesSessionBestLap'];

    private static readonly precision = 3;

    private getRaceDeltas(driverData: IDriverData[], position: number): string[] {
        const deltas: string[] = [];
        const deltaLoop = (front: boolean) => {
            const push = (delta: string) => {
                front ? deltas.unshift(delta) : deltas.push(delta);
            }

            let delta = 0;
            const me = driverData[position];
            for (let i = position + (front ? -1 : 1); front ? i >= 0 : i < driverData.length; front ? i-- : i++) {
                const driver = driverData[i];

                let lapDiff = me.completedLaps - driver.completedLaps;
                if (lapDiff < 0 && driver.lapDistance < me.lapDistance) {
                    lapDiff++;
                } else if (lapDiff > 0 && me.lapDistance < driver.lapDistance) {
                    lapDiff--;
                }

                if (lapDiff != 0) {
                    push(lapDiff > 0 ? `+${lapDiff}L` : `${lapDiff}L`);
                } else {
                    let nextDelta = front ? driver.timeDeltaBehind : driver.timeDeltaFront;
                    if (nextDelta < 0) {
                        front ? deltas.unshift(null) : deltas.push(null);
                        continue;
                    }
                    delta += nextDelta;
                    push(front ? (-delta).toFixed(PositionBar.precision) : '+' + delta.toFixed(PositionBar.precision));
                }
            }
        }

        deltaLoop(true);

        deltas.push(null);

        deltaLoop(false);

        return deltas;
    }

    protected override render(driverData: IDriverData[], position: number, sessionType: ESession, sessionBestSectors: ISectors, elementId: string): Hide | null {
        const positionBar = document.getElementById(elementId);

        const POSITION_BAR_SIZE = SettingsValue.get(POSITION_BAR_CELL_COUNT);

        if (POSITION_BAR_SIZE < positionBar.children.length) {
            for (let i = 0; i < positionBar.children.length - POSITION_BAR_SIZE; i++) {
                positionBar.lastChild.remove();
            }
        } else if (POSITION_BAR_SIZE > positionBar.children.length) {
            for (let i = 0; i < POSITION_BAR_SIZE - positionBar.children.length; i++) {
                const cell = document.createElement('div');
                cell.classList.add('position-bar-driver');
                cell.classList.add('row');

                const pos = document.createElement('span');
                pos.classList.add('position-bar-driver-position');

                const col = document.createElement('div');
                col.classList.add('col');

                const name = document.createElement('span');
                name.classList.add('position-bar-driver-name');

                const delta = document.createElement('span');
                delta.classList.add('position-bar-driver-delta');

                const time = document.createElement('span');
                time.classList.add('position-bar-driver-time');


                cell.appendChild(pos);
                
                col.appendChild(name);
                col.appendChild(delta);
                col.appendChild(time);

                cell.appendChild(col);

                positionBar.appendChild(cell);
            }
        }

        if (!valueIsValidAssertUndefined(position) || Driver.mainDriver == null) {
            return this.hide();
        }

        const classColors = getClassColors(driverData);

        position--;
        const me = driverData[position];

        if (me == null) {
            console.error('PositionBar: me is null');
            return this.hide();
        }

        const driverCount = driverData.length;
        const start = Math.max(0, Math.ceil(position - POSITION_BAR_SIZE / 2));
        const end = Math.min(driverCount - 1, Math.floor(position + POSITION_BAR_SIZE / 2));

        let raceDeltas: string[] = null;
        if (sessionType === ESession.Race) {
            raceDeltas = this.getRaceDeltas(driverData, position);
        } 

        let firstCell = start - Math.ceil(position - POSITION_BAR_SIZE / 2);
        for (let i = 0; i < POSITION_BAR_SIZE; i++) {
            const positionBarCell: HTMLDivElement = positionBar.children[i] as HTMLDivElement;

            if (positionBarCell == null) {
                continue;
            }

            const positionElement: HTMLSpanElement = positionBarCell.querySelector('.position-bar-driver-position');
            const nameElement: HTMLSpanElement = positionBarCell.querySelector('.position-bar-driver-name');
            const deltaElement: HTMLSpanElement = positionBarCell.querySelector('.position-bar-driver-delta');
            const timeElement: HTMLSpanElement = positionBarCell.querySelector('.position-bar-driver-time');

            const driverIndex = i - firstCell + start;
            if (start <= driverIndex && driverIndex <= end) {
                const driver = driverData[i - firstCell + start];
                const uid = getUid(driver.driverInfo);

                positionElement.style.backgroundColor = classColors.get(driver.driverInfo.classPerformanceIndex);
                positionElement.textContent = driver.placeClass.toString();

                if (Driver.mainDriver.userId === uid) {
                    positionBarCell.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                } else {
                    positionBarCell.style.backgroundColor = null;
                }
                nameElement.textContent = nameFormat(driver.driverInfo.name);
                nameElement.style.color = (driver !== me && driver.inPitlane) ? 'gray' : 'white';

                const myTime = validNumberOrDefault(me.sectorTimeBestSelf.sector3, null);

                let timeColor = 'gray';
                let deltaColor = 'white';

                let time = null;
                let deltaNumber: number = null;
                let deltaString: string = null;

                let showDeltaForMainDriver = false;
                switch (sessionType) {
                    case ESession.Race:
                        time = driver.sectorTimePreviousSelf.sector3;
                        if (valueIsValidAssertUndefined(time)) {
                            if (time <= sessionBestSectors.sector3) {
                                timeColor = 'purple';
                            } else if (time <= driver.sectorTimeBestSelf.sector3) {
                                timeColor = 'green';
                            }
                        }
                        if (driver.finishStatus === EFinishStatus.None || driver.finishStatus === EFinishStatus.Unavailable) {
                            deltaString = raceDeltas[driverIndex];
                        } else {
                            deltaString = EFinishStatus[driver.finishStatus];
                        }

                        switch (driver.finishStatus) {
                            case EFinishStatus.DNF:
                            case EFinishStatus.DQ:
                            case EFinishStatus.DNS:
                            case EFinishStatus.DNQ:
                                deltaColor = 'red';
                                showDeltaForMainDriver = true;
                                break;
                            case EFinishStatus.Finished:
                                deltaColor = 'rgb(255,215,0)'; // gold
                                showDeltaForMainDriver = true;
                                break;
                        }

                        break;
                    case ESession.Qualify:
                    case ESession.Practice:
                    case ESession.Warmup:
                        time = driver.sectorTimeBestSelf.sector3;
                        if (myTime != null && valueIsValidAssertUndefined(time)) {
                            deltaNumber = time - myTime;
                            deltaString = laptimeFormat(deltaNumber, true);
                        }
                        break;
                }

                if (time != null) {
                    timeElement.textContent = laptimeFormat(time, true);
                    timeElement.style.color = `var(--time-${timeColor})`;
                } else {
                    timeElement.textContent = '';
                }

                if (deltaString != null && (Driver.mainDriver.userId !== uid || showDeltaForMainDriver)) {
                    if (deltaNumber != null) deltaString = deltaNumber > 0 ? `+${deltaString}` : deltaString;

                    deltaElement.textContent = deltaString;
                    if (deltaString.startsWith('+') || deltaString.startsWith('-')) {
                        deltaElement.style.setProperty('margin-right', '0.5em', 'important');
                    } else {
                        deltaElement.style.marginRight = null;
                    }
                    deltaElement.style.color = deltaColor;
                } else {
                    deltaElement.textContent = '';
                }
            } else {
                positionElement.textContent = '';
                nameElement.textContent = '';
                deltaElement.textContent = '';
                timeElement.textContent = '';
                positionBarCell.style.backgroundColor = null;
            }
        }

        return null;
    }
}