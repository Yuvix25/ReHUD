import HudElement, {Hide} from "./HudElement.js";
import {Driver, getUid} from "../utils.js";
import {EFinishStatus, ESession, IDriverData, ISectors} from "../r3eTypes.js";
import SettingsValue from "../SettingsValue.js";
import { getClassColors, getSessionType, laptimeFormat, nameFormat, SESSION_TYPES, TV_TOWER_CAR_LOGO, TV_TOWER_CAR_LOGO_OR_LIVERY, TV_TOWER_MAX_SIZE_SETTING, TV_TOWER_RANKED_DATA, validNumberOrDefault, valueIsValidAssertNull } from "../consts.js";
import RankedData from "../actions/RankedData.js";

export default class TvTower extends HudElement {
    override sharedMemoryKeys: string[] = ['driverData', 'position', 'sessionType', 'sectorTimesSessionBestLap'];

    public static readonly IMAGE_REDIRECT = 'https://game.raceroom.com/store/image_redirect?id=';

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
                    push(front ? (-delta).toFixed(TvTower.precision) : '+' + delta.toFixed(TvTower.precision));
                }
            }
        }

        deltaLoop(true);

        deltas.push(null);

        deltaLoop(false);

        return deltas;
    }

    private rankedData: RankedData = null;

    protected override onHud(): void {
        this.rankedData = this.hud.rankedDataService;
    }


    protected override render(driverData: IDriverData[], position: number, sessionType: ESession, sessionBestSectors: ISectors, elementId: string): Hide | null {
        const tvTower = document.getElementById(elementId);

        const TV_TOWER_MAX_SETTING = SettingsValue.get(TV_TOWER_MAX_SIZE_SETTING);

        const TV_TOWER_CAR_LOGO_SETTING = SettingsValue.get(TV_TOWER_CAR_LOGO);
        const TV_TOWER_RANKED_DATA_SETTING = SettingsValue.get(TV_TOWER_RANKED_DATA);
        //const TV_TOWER_COUNTY_FLAG_SETTING = SettingsValue.get(TV_TOWER_COUNTRY_FLAG);
        const TV_TOWER_CAR_LOGO_OR_LIVERY_SETTING = SettingsValue.get(TV_TOWER_CAR_LOGO_OR_LIVERY);
        

        const driverCount = driverData.length;

        const TV_TOWER_MAX_SIZE = Math.min(TV_TOWER_MAX_SETTING, driverCount)


        if (TV_TOWER_MAX_SIZE < tvTower.children.length) {
            
            for (let i = 0; i < tvTower.children.length - TV_TOWER_MAX_SIZE; i++) {
                tvTower.lastChild.remove();
            }
        } else if (TV_TOWER_MAX_SIZE > tvTower.children.length) {
            for (let i = 0; i < TV_TOWER_MAX_SIZE - tvTower.children.length; i++) {

                const cell = document.createElement('div');
                cell.classList.add('tv-tower-driver');
                
                const position = document.createElement('posEl');
                position.classList.add('tv-tower-driver-position');

                const classColor = document.createElement('classEl');
                classColor.classList.add('tv-tower-driver-class');

                //const countryFlag = document.createElement('flagEl');
                //countryFlag.classList.add('tv-tower-driver-flag');

                const carImage = document.createElement('carImg');
                carImage.classList.add('tv-tower-driver-car-image');

                const name = document.createElement('nameEl');
                name.classList.add('tv-tower-driver-name');

                const rat = document.createElement('ratEl');
                rat.classList.add('tv-tower-driver-rating');

                const rep = document.createElement('repEl');
                rep.classList.add('tv-tower-driver-reputation');
                
                const laptime = document.createElement('lapEl');
                laptime.classList.add('tv-tower-driver-laptime');
                
                const delta = document.createElement('deltaEl');
                delta.classList.add('tv-tower-driver-delta');

                cell.appendChild(position);
                cell.appendChild(classColor);
                //cell.appendChild(countryFlag);
                cell.appendChild(name);
                cell.appendChild(carImage);
                cell.appendChild(rat);
                cell.appendChild(rep);
                cell.appendChild(laptime);
                cell.appendChild(delta);

                tvTower.appendChild(cell);
            }
        }
        
        if (!valueIsValidAssertNull(position) || Driver.mainDriver == null) {
            return this.hide();
        }

        const classColors = getClassColors(driverData);

        position --;
        const me = driverData[position];

        if (me == null) {
            console.error('Tv Tower: me is null');
            return this.hide();
        }

        let raceDeltas: string[] = null;
        if (sessionType === ESession.Race) {
            raceDeltas = this.getRaceDeltas(driverData, position);
        } 
        let currentDriverUpdate;
        for (let i = 0; i < Math.min(TV_TOWER_MAX_SIZE); i++) {

            let start = 0;
            let end = TV_TOWER_MAX_SIZE;

            const tvTowerCell: HTMLDivElement = tvTower.children[i] as HTMLDivElement;

            if (tvTowerCell == null) {
                continue;
            }

            const driverElement: HTMLSpanElement = tvTower.querySelector('.tv-tower-driver');
            const positionElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-position');
            const classColorElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-class');
            //const flagElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-flag');
            const carImageElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-car-image');
            const nameElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-name');
            const ratingElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-rating');
            const reputationElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-reputation');
            const laptimeElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-laptime');
            const deltaElement: HTMLSpanElement = tvTowerCell.querySelector('.tv-tower-driver-delta');

            if (start <= i && i <= end) {
            if(i == 0) {
            currentDriverUpdate = i;
            }

            const driverDistanceToFirst = position - 1;
            const driverDistanceToLast = driverCount - position + 1;
            const driverSettingHalf = Math.floor((TV_TOWER_MAX_SETTING - 1) / 2);
            let mandatoryFirstPlace = false;

            let notInFirstRange = false;
            driverDistanceToFirst >= (TV_TOWER_MAX_SETTING / 2) ? notInFirstRange = true : notInFirstRange = false;

            let inLastRange = false;
            driverDistanceToLast <= (TV_TOWER_MAX_SETTING / 2) ? inLastRange = true : inLastRange = false;

            
            // assigning when not in range of first and last
            if(notInFirstRange && !inLastRange) {
                mandatoryFirstPlace = true;

                if(i == currentDriverUpdate) {
                currentDriverUpdate = position - driverSettingHalf;
                }
            }
            // assigning when in range of the last driver
            if(inLastRange && driverCount > TV_TOWER_MAX_SETTING) {
                mandatoryFirstPlace = true;

                if(i == currentDriverUpdate) {
                currentDriverUpdate = driverCount - TV_TOWER_MAX_SETTING + 1;
                }
            }


            //assigning 1st cell if mandatory -> out of range of P1
            if(i == 0 && mandatoryFirstPlace) {
                currentDriverUpdate = 0;
            }


                const driver = driverData[currentDriverUpdate];
                const isDriver: boolean = Driver.mainDriver.userId === getUid(driver.driverInfo) ? true : false;

                if(mandatoryFirstPlace && currentDriverUpdate == 0) {
                    driverElement.style.marginBottom = '10px';
                } else if (!mandatoryFirstPlace) {
                    driverElement.style.marginBottom = '';
                }

                positionElement.textContent = driver.place.toString();
                
                const driverColor = classColors.get(driver.driverInfo.classPerformanceIndex);
                classColorElement.style.backgroundColor = 
                driverColor == null ? 'white': driverColor;

                nameElement.textContent = nameFormat(driver.driverInfo.name);
                if(isDriver) {
                    positionElement.style.backgroundColor = 'rgb(255,215,0)';
                    nameElement.style.color = 'rgb(255,215,0)';
                } else {
                    positionElement.style.backgroundColor = '';
                    nameElement.style.color = '';
                }
                if(!isDriver && driver.inPitlane) {
                nameElement.style.color = 'grey'
                }

                const rankedData = this.rankedData.getRankedData(driver.driverInfo.userId);
                const rating = rankedData?.Rating.toFixed(0) ?? '1500';
                const reputation = rankedData?.Reputation.toFixed(0) ?? '70';
                
                ratingElement.textContent = `${rating}`;
                
                reputationElement.textContent = `${reputation}`;

                if (!TV_TOWER_RANKED_DATA_SETTING) {
                    ratingElement.style.display = 'none';
                    reputationElement.style.display = 'none';
                } else {
                    ratingElement.style.display = 'inline-block';
                    reputationElement.style.display = 'inline-block';
                }
                const manufacturerId = driver.driverInfo.manufacturerId.toString();
                const liveryId = driver.driverInfo.liveryId.toString();
                const liveryChoice = TV_TOWER_CAR_LOGO_OR_LIVERY_SETTING == 'livery' ? true : false;
                
                const imageSrc =  liveryChoice ?
                `url("${TvTower.IMAGE_REDIRECT + liveryId + '&size=thumb'}")` :
                `url("${TvTower.IMAGE_REDIRECT + manufacturerId + '&size=thumb'}")`

                carImageElement.style.backgroundImage = imageSrc;
                if(liveryChoice) {
                    carImageElement.style.aspectRatio = '2.8';
                    carImageElement.style.backgroundSize = '50px 25px';
                    carImageElement.style.backgroundColor = '';
                } else {
                    carImageElement.style.aspectRatio = '';
                    carImageElement.style.backgroundSize = '';
                    carImageElement.style.backgroundColor = 'white';
                }
                
                if (!TV_TOWER_CAR_LOGO_SETTING) {
                    carImageElement.style.display = 'none';
                } else {
                    carImageElement.style.display = 'inline-block';
                }

                const myTime = validNumberOrDefault(me.sectorTimeBestSelf.sector3, null);

                let timeColor = 'white';
                let deltaColor = 'white';

                let time = null;
                let deltaNumber: number = null;
                let deltaString: string = null;

                let showDeltaForMainDriver = false;
                switch (sessionType) {
                    case ESession.Race:
                        time = driver.sectorTimePreviousSelf.sector3;
                        if (valueIsValidAssertNull(time)) {
                            if (time <= sessionBestSectors.sector3) {
                                timeColor = 'purple';
                            } else if (time <= driver.sectorTimeBestSelf.sector3) {
                                timeColor = 'green';
                            }
                        }
                        if (driver.finishStatus === EFinishStatus.None || driver.finishStatus === EFinishStatus.Unavailable) {
                            deltaString = raceDeltas[driver.place - 1];
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
                        if (myTime != null && valueIsValidAssertNull(time)) {
                            deltaNumber = time - myTime;
                            deltaString = laptimeFormat(deltaNumber, true);
                        }
                        break;
                }

                if (time != null) {
                    laptimeElement.textContent = laptimeFormat(time, true);
                    laptimeElement.style.color = timeColor;
                } else {
                    laptimeElement.textContent = '';
                }

                if (deltaString != null && (Driver.mainDriver.userId !== driver.driverInfo.userId.toString() || showDeltaForMainDriver)) {
                    if (deltaNumber != null) deltaString = deltaNumber > 0 ? `+${deltaString}` : deltaString;

                    !isDriver ? deltaElement.textContent = deltaString : deltaElement.textContent = '';
                    deltaElement.style.color = deltaColor;
                } else {
                    deltaElement.textContent = '';
                }
                currentDriverUpdate ++;
            } else {
                positionElement.style.backgroundColor = '';
                nameElement.style.color = '';
                positionElement.textContent = '';
                classColorElement.style.backgroundColor = null;
                nameElement.textContent = '';
                ratingElement.textContent = '';
                reputationElement.textContent = '';
                carImageElement.style.backgroundImage = '';
                laptimeElement.style.color = '';
                laptimeElement.textContent = '';
                deltaElement.textContent = '';
                driverElement.style.marginBottom = '';
            }
        }
        return null;
    }
}