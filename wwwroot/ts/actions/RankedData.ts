import EventListener from "../EventListener.js";
import {IDriverData} from "../r3eTypes.js";

export type RankedDataEntry = {
    UserId: number,
    Username: string,
    Fullname: string,
    Rating: number,
    Reputation: number,
    ActivityPoints: number,
    RacesCompleted: number,
    CountryCode: string,
    Team: string,
};


export default class RankedData extends EventListener {
    private static readonly URL = 'https://game.raceroom.com/multiplayer-rating/ratings.json';
    public rankedData: {[key: string]: RankedDataEntry} = null;

    private isLoading: boolean = false;

    constructor() {
        super();

        this.onSessionChange();
    }

    protected override async onSessionChange(): Promise<void> {
        if (this.isLoading)
            return;

        this.isLoading = true;
        const rankedData: RankedDataEntry[] = await (await fetch(RankedData.URL)).json();
        this.rankedData = {};
        for (const driver of rankedData) {
            this.rankedData[driver.UserId.toString()] = driver;
        }

        console.log('Loaded ranked data');
        this.isLoading = false;
    }

    public getRankedData(uid: string | number): RankedDataEntry {
        if (this.rankedData == null) {
            this.onSessionChange();
            return null;
        }

        return this.rankedData[uid.toString()];
    }

    public getRankedDataForDriver(driver: IDriverData): RankedDataEntry {
        return this.getRankedData(driver.driverInfo.userId);
    }
}