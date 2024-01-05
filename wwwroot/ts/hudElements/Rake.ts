import HudElement, {Hide} from "./HudElement.js";
import {valueIsValid, NA} from "../consts.js";
import {IPlayerData, IDriverInfo} from "../r3eTypes.js";

export default class Rake extends HudElement {
    override inputKeys: string[] = ['player','vehicleInfo'];

    protected override render(playerData: IPlayerData, vehicleInfo: IDriverInfo): string {
        const car = document.getElementById('car-side');
        const pointer = document.getElementById('rake-bar-pointer')
        const heightFront = (playerData.rideHeight.frontLeft + playerData.rideHeight.frontRight) / 2;
        const heightRear = (playerData.rideHeight.rearLeft + playerData.rideHeight.rearRight) / 2;
        const wheelbaseAprox = vehicleInfo.carLength * 0.7 ; //using an approximation because only the full length is given

        let rakeNumber = heightFront / heightRear - 1;

        let rakeDeg = rakeNumber < 0 ? Math.asin((heightRear - heightFront) / wheelbaseAprox) :
        Math.asin((heightFront - heightRear) / wheelbaseAprox) * -1;
        rakeDeg *= 57.2957795; //rad to deg
        
        rakeNumber < 0 ? car.style.transformOrigin = '16.53% 73.8%' : car.style.transformOrigin = '80.87% 73.8%'; //origin to wheel center 
        car.style.transform = `rotate(${Math.min(Math.max(rakeNumber * 30, -60), 60)}deg)`;

        pointer.style.left = `${50 + Math.min(Math.max(rakeNumber * 60, -49), 49)}%` //clamping value so it stays in the bar

        return `${valueIsValid(rakeNumber) ? rakeDeg.toFixed(2) : NA}°`;
    }
}