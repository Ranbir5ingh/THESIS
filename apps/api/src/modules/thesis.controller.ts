import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { ThesisService } from "./thesis.service";
class ChallengeDto { @IsString() symbol!: string; @IsString() @MinLength(8) @MaxLength(2000) thesis!: string; @IsUUID() userId!: string; @IsOptional() @IsObject() profile?: Record<string, unknown>; }
@Controller("thesis")
export class ThesisController {
  constructor(private readonly service: ThesisService) {}
  @Post("analyze") analyze(@Body() body: ChallengeDto) { return this.service.challenge(body); }
  @Post("save") save(@Body() body: any) { return this.service.save(body); }
  @Get() list(@Query("userId") userId: string) { return this.service.list(userId); }
}
