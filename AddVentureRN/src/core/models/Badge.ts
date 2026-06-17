export class Badge {
  public badgeID: number;
  public badgeName: string;
  public badgeDescription: string;
  public requiredStars: number;

  constructor(
    badgeID: number,
    badgeName: string,
    badgeDescription: string,
    requiredStars: number
  ) {
    this.badgeID = badgeID;
    this.badgeName = badgeName;
    this.badgeDescription = badgeDescription;
    this.requiredStars = requiredStars;
  }
}
