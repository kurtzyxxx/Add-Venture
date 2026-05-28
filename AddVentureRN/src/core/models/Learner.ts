export class Learner {
  public learnerID: number;
  public name: string;
  public stars: number;

  constructor(learnerID: number, name: string, stars: number) {
    this.learnerID = learnerID;
    this.name = name;
    this.stars = stars;
  }
}
