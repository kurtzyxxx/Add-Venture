export class ErrorPattern {
  public error_id: number;
  public error_type: string;
  public strategy_id: number;
  public frequency: number;

  constructor(
    error_id: number,
    error_type: string,
    strategy_id: number,
    frequency: number
  ) {
    this.error_id = error_id;
    this.error_type = error_type;
    this.strategy_id = strategy_id;
    this.frequency = frequency;
  }
}
