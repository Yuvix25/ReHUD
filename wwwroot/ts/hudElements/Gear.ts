import {TRUCK_CLASS_ID} from '../consts.js';
import {EEngineType, IDriverInfo} from '../r3eTypes.js';
import HudElement from "./HudElement.js";

export default class Gear extends HudElement {
    override inputKeys: string[] = ['gear', 'vehicleInfo'];

    private static readonly normalGearMap = new Map<number, string>([
        [-1, 'R'],
        [0, 'N'],
    ]);
    private static readonly electricGearMap = new Map<number, string>([
        [-1, 'R'],
        [0, 'N'],
        [1, 'D'],
        [2, 'S'],
    ]);
    private static readonly truckGearMap = new Map<number, string>([
        [-1, 'R'],
        [0, 'N'],
        [1, '1L'],
        [2, '1H'],
        [3, '2L'],
        [4, '2H'],
        [5, '3L'],
        [6, '3H'],
        [7, '4L'],
        [8, '4H'],
        [9, '5L'],
        [10, '5H'],
        [11, '6L'],
        [12, '6H'],
        [13, '7L'],
        [14, '7H'],
        [15, '8L'],
        [16, '8H'],
    ]);


    protected override render(gear: number, vehicleInfo: IDriverInfo, elementId: string): string {
        const gearElement = document.getElementById(elementId);

        let map;
        switch (vehicleInfo.engineType) {
            case EEngineType.Electric:
                map = Gear.electricGearMap;
                break;
            case EEngineType.Combustion:
            case EEngineType.Hybrid:
                if (vehicleInfo.classId === TRUCK_CLASS_ID) {
                    map = Gear.truckGearMap;
                } else {
                    map = Gear.normalGearMap;
                }
                break;
            default:
                return gear.toString();
        }

        const res = map.has(gear) ? map.get(gear) : gear.toString();
        if (res.length == 1) {
            gearElement.classList.add('one-digit');
        } else {
            gearElement.classList.remove('one-digit');
        }

        return res;
    }
}