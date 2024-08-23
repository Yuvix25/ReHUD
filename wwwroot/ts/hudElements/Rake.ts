import HudElement from "./HudElement.js";
import {valueIsValid, NA} from "../consts.js";
import {IPlayerData, IDriverInfo} from "../r3eTypes.js";

export default class Rake extends HudElement {
    override sharedMemoryKeys: string[] = ['player','vehicleInfo'];

    protected override render(playerData: IPlayerData, vehicleInfo: IDriverInfo): string {
        const rakeBar = document.getElementById('rake-bar');
        const car = document.getElementById('car-side');
        const pointer = document.getElementById('rake-bar-pointer')
        const heightFront = (playerData.rideHeight.frontLeft + playerData.rideHeight.frontRight) / 2;
        const heightRear = (playerData.rideHeight.rearLeft + playerData.rideHeight.rearRight) / 2;
        const wheelbaseAprox = vehicleInfo.carLength * 0.7 ; // using an approximation because only the full length is given

        let rakeNumber = heightFront / heightRear - 1;

        let rakeDeg = rakeNumber < 0 ? Math.asin((heightRear - heightFront) / wheelbaseAprox) :
        Math.asin((heightFront - heightRear) / wheelbaseAprox) * -1;
        rakeDeg *= 57.2957795; // rad to deg

        if (rakeNumber < 0) { // origin to wheel center
            car.style.transformOrigin = '16.53% 73.8%';
        } else {
            car.style.transformOrigin = '80.87% 73.8%';
        }

        car.style.transform = `rotate(${Math.min(Math.max(rakeNumber * 30, -60), 60)}deg)`;

        const rakeBarHalfWidth = rakeBar.clientWidth / 2;
        const rakeClamped = Math.min(Math.max(rakeNumber * 100, -rakeBarHalfWidth), rakeBarHalfWidth); // clamping value so it stays in the bar
        pointer.style.transform = `translateX(${rakeClamped}px)`;

        return `${valueIsValid(rakeNumber) && !isNaN(rakeNumber) ? rakeDeg.toFixed(2) : NA}°`;
    }
}