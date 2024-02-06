import SharedMemoryConsumer from './SharedMemoryConsumer.js';

export default abstract class NamedEntity extends SharedMemoryConsumer {
  private readonly name: string;

  public getName() {
    return this.name;
  }

  constructor(name: string) {
    super();
    this.name = name;
  }

  public override toString() {
    return this.name;
  }
}