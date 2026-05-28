export class Session {
  public sessionID: number;
  public learnerID: number;
  public sessionDate: Date;
  public startTime: string;
  public endTime: string;
  public totalStars: number;
  public overallProgress: number;
  public summaryGenerated: boolean;

  constructor(
    sessionID: number,
    learnerID: number,
    sessionDate: Date,
    startTime: string,
    endTime: string,
    totalStars: number,
    overallProgress: number,
    summaryGenerated: boolean
  ) {
    this.sessionID = sessionID;
    this.learnerID = learnerID;
    this.sessionDate = sessionDate;
    this.startTime = startTime;
    this.endTime = endTime;
    this.totalStars = totalStars;
    this.overallProgress = overallProgress;
    this.summaryGenerated = summaryGenerated;
  }
}
