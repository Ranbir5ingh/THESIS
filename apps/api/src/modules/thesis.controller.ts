import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ThesisService } from "./thesis.service";

class ChallengeDto {
  @IsString() symbol!: string;
  @IsString() @MinLength(8) @MaxLength(2000) thesis!: string;
  @IsOptional() @IsObject() profile?: Record<string, unknown>;
}

@Controller("thesis")
export class ThesisController {
  constructor(private readonly service: ThesisService) {}
  @Post("analyze") analyze(@Body() body: ChallengeDto) { return this.service.challenge(body); }
  @Post("save") save(@Body() body: any) { return this.service.save(body); }
  @Get() list() { return this.service.list(); }
}
