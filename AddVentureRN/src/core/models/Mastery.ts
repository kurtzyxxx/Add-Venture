export class Mastery {
  public mastery_id: number;
  public strategy_id: number; // Given as int in Class Diagram
  public visual_guidance_level: number;

  constructor(
    mastery_id: number,
    strategy_id: number,
    visual_guidance_level: number
  ) {
    this.mastery_id = mastery_id;
    this.strategy_id = strategy_id;
    this.visual_guidance_level = visual_guidance_level;
  }
}
