import Action from '../Action.js';
import {
  IExtendedShared,
  addObjects,
  multiplyObject,
  valueIsValidAssertUndefined,
} from '../consts.js';
import IShared, { ESession, IDriverData, ITireData } from '../r3eTypes.js';

export default class TireManager extends Action {
  override sharedMemoryKeys: string[] = ['tireWear', 'vehicleInfo', 'layoutId', 'tireWearActive', 'gameInReplay', 'gamePaused', 'currentLapValid'];
  override isEnabled(): boolean {
    return true;
  }
  
  private state = {
    carId: -1,
    layoutId: -1,
    tireWearLevel: 0,
  };
  private static readonly WEAR_BUFFER_SIZE = 10; // how many laps to average
  private wear: ITireData<number>[] = [];
  private lastWear: ITireData<number> = null;
  private averageWear: ITireData<number> = null;

  private lastLapValid: boolean = false;

  constructor() {
    super('TireManager');
  }

  protected override onNewLap(
    data: IShared,
    driver: IDriverData,
    isMainDriver: boolean
  ): void {
    if (!isMainDriver) return;

    if (this.checkState(data)) {
      if (this.lastWear != null) {
        const wear = addObjects(
          this.lastWear,
          multiplyObject(data.tireWear, -1)
        ); // last - current
        if (Object.values(wear).some((v) => v < 0)) {
          return;
        }
        this.wear.push(wear);
        if (this.wear.length > TireManager.WEAR_BUFFER_SIZE) {
          this.wear.shift();
        }

        // calculate average
        let averageWear = {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0,
        };
        for (const wear of this.wear) {
          averageWear = addObjects(averageWear, wear);
        }
        this.averageWear = multiplyObject(averageWear, 1 / this.wear.length);
      }
    }

    this.lastWear = data.tireWear;

    this.lastLapValid = true;
  }

  protected override onPitlaneEntrance(
    data: IShared,
    driver: IDriverData,
    isMainDriver: boolean
  ): void {
    if (isMainDriver) this.clearState(data, false);
  }
  protected override onPositionJump(
    data: IShared,
    driver: IDriverData,
    isMainDriver: boolean
  ): void {
    if (isMainDriver) this.clearState(data, false);
  }
  protected override onSessionChange(
    data: IShared,
    lastSession: ESession
  ): void {
    this.clearState(data, false);
  }

  private clearState(data: IShared, clearAverage: boolean = true): void {
    this.state.carId = data.vehicleInfo.modelId;
    this.state.layoutId = data.layoutId;
    this.state.tireWearLevel = data.tireWearActive;
    if (clearAverage) {
      this.wear = [];
      this.averageWear = null;
    }
    this.lastWear = null;
    this.lastLapValid = false;
    console.log('Cleared tire manager state');
  }

  private checkState(data: IShared): boolean {
    if (
      this.state.carId != data.vehicleInfo.modelId ||
      this.state.layoutId != data.layoutId ||
      this.state.tireWearLevel != data.tireWearActive
    ) {
      this.clearState(data);
    }
    return (
      this.state.tireWearLevel > 0 &&
      Object.values(data.tireWear).every(valueIsValidAssertUndefined) &&
      this.lastLapValid &&
      !data.gameInReplay &&
      !data.gamePaused
    );
  }

  public getAverageWear(): ITireData<number> {
    return structuredClone(this.averageWear);
  }

  override execute(data: IExtendedShared): void {
    if (!data.rawData.currentLapValid) {
      this.lastLapValid = false;
    }
    this.checkState(data.rawData);
  }
}
