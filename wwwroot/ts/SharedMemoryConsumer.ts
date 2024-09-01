import {IExtendedShared} from './consts.js';
import IShared from './r3eTypes.js';
import SharedMemorySupplier from './SharedMemorySupplier.js';

// SharedMemoryKey is +key for extra data, key for raw shared memory data
export type SharedMemoryKey = `+${keyof IExtendedShared}` | keyof IShared;

/**
 * The shared memory data is a rather large object, and not all consumers need all of it.
 * This class allows consumers to specify which parts of the shared memory they are interested in, thus reducing the amount of data that needs to be sent from the backend via the not so fast IPC.
 */
export default abstract class SharedMemoryConsumer {
    /**
     * Specifies which shared memory keys the consumer is interested in. Keys starting with '+' are taken from the extra data, otherwise from the raw shared memory data.
     */
    abstract readonly sharedMemoryKeys: SharedMemoryKey[];

    /**
     * Specifies whether the consumer is currently consuming shared memory data.
     */
    abstract isEnabled(): boolean;

    public getInputs(data: IExtendedShared): any[] {
        const asAny = data as any;
        const values = [];
        for (const valueName of this.sharedMemoryKeys) {
            if (valueName.startsWith('+')) {
                values.push(asAny[valueName.slice(1)]);
                continue;
            }
            values.push(asAny.rawData[valueName]);
        }
        return values;
    }

    constructor() {
        SharedMemorySupplier.registerConsumer(this);
    }
}