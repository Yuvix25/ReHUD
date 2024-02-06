import SharedMemorySupplier from './SharedMemorySupplier.js';

/**
 * The shared memory data is a rather large object, and not all consumers need all of it.
 * This class allows consumers to specify which parts of the shared memory they are interested in, thus reducing the amount of data that needs to be sent from the backend via the not so fast IPC.
 */
export default abstract class SharedMemoryConsumer {
    /**
     * Specifies which shared memory keys the consumer is interested in. Keys starting with '+' are taken from the extra data, otherwise from the raw shared memory data.
     */
    abstract readonly sharedMemoryKeys: string[];

    /**
     * Specifies whether the consumer is currently consuming shared memory data.
     */
    abstract isEnabled(): boolean;

    constructor() {
        SharedMemorySupplier.registerConsumer(this);
    }
}