import HudElement, {Hide} from "./HudElement.js";
import {SESSION_TYPES, getSessionType, valueIsValid} from "../consts.js";
import {ESessionPhase} from "../r3eTypes.js";

export default class TimeLeft extends HudElement {
    override inputKeys: string[] = ['sessionTimeRemaining', 'numberOfLaps', 'sessionType', 'completedLaps', 'sessionPhase'];

    protected override render(timeLeft: number, raceNumberOfLaps: number, sessionType: keyof typeof SESSION_TYPES, myLaps: number, sessionPhase: ESessionPhase): null | Hide {
        const timeLeftElement = document.getElementById('time-left');
        const lapsLeftElement = document.getElementById('laps-left');
        const sessionTypeElement = document.getElementById('session-type');

        const localHide = () => {
            timeLeftElement.style.display = 'block';
            lapsLeftElement.style.display = 'none';
            timeLeftElement.children[0].textContent = '23';
            timeLeftElement.children[1].textContent = '59';
            timeLeftElement.children[2].textContent = '59';
            return this.hide();
        };

        const showLapsLeft = (text: string) => {
            timeLeftElement.style.display = 'none';
            lapsLeftElement.style.display = 'block';
            lapsLeftElement.innerText = text;
        };

        if (sessionPhase === ESessionPhase.Checkered) {
            if (timeLeftElement.style.display != 'none') {
                timeLeft = 0;
            } else if (lapsLeftElement.style.display != 'none') {
                showLapsLeft('Session over');
                sessionTypeElement.innerText = '';

                return null;
            }
        }


        if (!valueIsValid(timeLeft) && raceNumberOfLaps >= 0) {
            sessionType = 4;

            if (!valueIsValid(myLaps))
                myLaps = 0;

            showLapsLeft(`${myLaps + 1}/${raceNumberOfLaps}`);
        } else if (timeLeft >= 0) {
            timeLeftElement.style.display = 'block';
            lapsLeftElement.style.display = 'none';
            timeLeftElement.children[0].textContent = Math.floor(timeLeft / 3600).toString(); // hours
            timeLeftElement.children[1].textContent = (Math.floor(timeLeft / 60) % 60).toString().padStart(2, '0'); // minutes
            timeLeftElement.children[2].textContent = (Math.floor(timeLeft) % 60).toString().padStart(2, '0'); // seconds
        } else {
            return localHide();
        }

        sessionTypeElement.innerText = getSessionType(sessionType);

        return null;
    }
}