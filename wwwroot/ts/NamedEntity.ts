export default class NamedEntity {
  private readonly name: string;

  public getName() {
    return this.name;
  }

  constructor(name: string) {
    this.name = name;
  }

  public toString() {
    return this.name;
  }
}