export class SessionSummary {
  public summary_id: number;
  public total_activities: number;
  public accuracy_rate: number;
  public stars_earned: number;
  public areas_needing_practice: string;

  constructor(
    summary_id: number,
    total_activities: number,
    accuracy_rate: number,
    stars_earned: number,
    areas_needing_practice: string
  ) {
    this.summary_id = summary_id;
    this.total_activities = total_activities;
    this.accuracy_rate = accuracy_rate;
    this.stars_earned = stars_earned;
    this.areas_needing_practice = areas_needing_practice;
  }
}
