import HudElement, {Hide} from "./HudElement.js";
import {POSITION_BAR_SIZE, laptimeFormat, valueIsValid, validNumberOrDefault, nameFormat, getClassColors} from "../consts.js";
import {ESession, IDriverData, ISectors} from "../r3eTypes.js";
import {Driver, getUid} from "../utils.js";

export default class PositionBar extends HudElement {
    override inputKeys: string[] = ['driverData', 'position', 'sessionType', 'sectorTimesSessionBestLap'];

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

    protected override render(driverData: IDriverData[], position: number, sessionType: ESession, sessionBestSectors: ISectors): Hide | null {
        if (!valueIsValid(position) || Driver.mainDriver == null) {
            return this.hide();
        }

        const classColors = getClassColors(driverData);

        position--;
        const me = driverData[position];

        const driverCount = driverData.length;
        const start = Math.max(0, Math.ceil(position - POSITION_BAR_SIZE / 2));
        const end = Math.min(driverCount - 1, Math.floor(position + POSITION_BAR_SIZE / 2));

        let raceDeltas: string[] = null;
        if (sessionType === ESession.Race) {
            raceDeltas = this.getRaceDeltas(driverData, position);
        } 

        let firstCell = start - Math.ceil(position - POSITION_BAR_SIZE / 2);
        for (let i = 0; i < POSITION_BAR_SIZE; i++) {
            const positionBarCell = document.getElementById(`position-bar-driver-${i}`);

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

                const myTime = validNumberOrDefault(me.sectorTimeBestSelf.sector3, null);

                let timeColor = 'gray';

                let time = null;
                let deltaNumber: number = null;
                let deltaString: string = null;
                switch (sessionType) {
                    case ESession.Race:
                        time = driver.sectorTimePreviousSelf.sector3;
                        if (valueIsValid(time)) {
                            if (time <= sessionBestSectors.sector3) {
                                timeColor = 'purple';
                            } else if (time <= driver.sectorTimeBestSelf.sector3) {
                                timeColor = 'green';
                            }
                        }
                        deltaString = raceDeltas[driverIndex];
                        break;
                    case ESession.Qualify:
                    case ESession.Practice:
                    case ESession.Warmup:
                        time = driver.sectorTimeBestSelf.sector3;
                        if (myTime != null && valueIsValid(time)) {
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

                if (deltaString != null && Driver.mainDriver.userId !== uid) {
                    if (deltaNumber != null) deltaString = deltaNumber > 0 ? `+${deltaString}` : deltaString;

                    deltaElement.textContent = deltaString;
                    if (deltaString.startsWith('+') || deltaString.startsWith('-')) {
                        deltaElement.style.setProperty('margin-right', '0.5em', 'important');
                    } else {
                        deltaElement.style.marginRight = null;
                    }
                } else {
                    deltaElement.textContent = '';
                }
            } else {
                positionElement.textContent = '';
                nameElement.textContent = '';
                deltaElement.textContent = '';
                timeElement.textContent = '';
            }
        }

        return null;
    }
}