export class PerformanceTrend {
  public trend_id: number;
  public session_id: number;
  public strategy_id: string;
  public accuracy_rate: number;
  public avg_response_time: number;
  public error_count: number;

  constructor(
    trend_id: number,
    session_id: number,
    strategy_id: string,
    accuracy_rate: number,
    avg_response_time: number,
    error_count: number = 0
  ) {
    this.trend_id = trend_id;
    this.session_id = session_id;
    this.strategy_id = strategy_id;
    this.accuracy_rate = accuracy_rate;
    this.avg_response_time = avg_response_time;
    this.error_count = error_count;
  }
}
