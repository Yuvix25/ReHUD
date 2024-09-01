import EventListener from "../EventListener.js";
import {IDriverData} from "../r3eTypes.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

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
    override sharedMemoryKeys: SharedMemoryKey[] = [];
    override isEnabled(): boolean {
        return true;
    }

    private static readonly URL = 'https://game.raceroom.com/multiplayer-rating/ratings.json';
    public rankedData: {[key: string]: RankedDataEntry} = null;

    private isLoading: boolean = false;

    constructor() {
        super('RankedDataService');

        this.onSessionChange();
    }

    protected override async onSessionChange(): Promise<void> {
        if (this.isLoading)
            return;

        this.isLoading = true;
        try {
            const rankedData: RankedDataEntry[] = await (await fetch(RankedData.URL)).json();

            this.rankedData = {};
            for (const driver of rankedData) {
              this.rankedData[driver.UserId.toString()] = driver;
            }

            console.log('Loaded ranked data');
        } catch (e) {
            console.error('Failed to load ranked data', e);
        } finally {
            this.isLoading = false;
        }
    }

    public getRankedData(uid: number): RankedDataEntry {
        if (this.rankedData == null) {
            this.onSessionChange();
            return null;
        }

        return this.rankedData[uid.toString()] ?? {
            UserId: uid,
            Username: null,
            Fullname: null,
            Rating: 1500,
            Reputation: 70,
            ActivityPoints: 0,
            RacesCompleted: 0,
            CountryCode: null,
            Team: null,
        }
    }

    public getRankedDataForDriver(driver: IDriverData): RankedDataEntry {
        return this.getRankedData(driver.driverInfo.userId);
    }
}