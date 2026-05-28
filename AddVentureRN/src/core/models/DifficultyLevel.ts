export class DifficultyLevel {
  public difficulty_id: number;
  public difficulty_name: string;
  public difficulty_rank: number;
  public visual_guidance_level: number;
  public parameters: string;

  constructor(
    difficulty_id: number,
    difficulty_name: string,
    difficulty_rank: number,
    visual_guidance_level: number,
    parameters: string = ""
  ) {
    this.difficulty_id = difficulty_id;
    this.difficulty_name = difficulty_name;
    this.difficulty_rank = difficulty_rank;
    this.visual_guidance_level = visual_guidance_level;
    this.parameters = parameters;
  }
}
