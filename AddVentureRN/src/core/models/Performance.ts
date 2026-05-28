export class Performance {
  public accuracy: number;
  public responseTime: number;

  constructor(accuracy: number, responseTime: number) {
    this.accuracy = accuracy;
    this.responseTime = responseTime;
  }
}
