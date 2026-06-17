export enum MisconceptionType {
  OFF_BY_ONE = 'OFF_BY_ONE',
  SWAPPED_DIGITS = 'SWAPPED_DIGITS',
  IGNORED_BASE = 'IGNORED_BASE',
  UNKNOWN = 'UNKNOWN',
}

export class Misconception {
  public misconception_id: number;
  public misconception_type: string;
  public times_detected: number;

  constructor(
    misconception_id: number,
    misconception_type: string,
    times_detected: number
  ) {
    this.misconception_id = misconception_id;
    this.misconception_type = misconception_type;
    this.times_detected = times_detected;
  }
}
