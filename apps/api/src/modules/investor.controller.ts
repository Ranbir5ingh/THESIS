import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsString, IsUUID } from "class-validator";
import { InvestorService } from "./investor.service";
class InvestorDto { @IsUUID() userId!: string; @IsString() goal!: string; @IsString() riskTolerance!: string; @IsString() timeHorizon!: string; @IsString() knowledgeLevel!: string; @IsString() growthPreference!: string; @IsString() incomePreference!: string; }
@Controller("investor-profile")
export class InvestorController {
  constructor(private readonly service: InvestorService) {}
  @Get() get(@Query("userId") userId: string) { return this.service.get(userId); }
  @Post() save(@Body() body: InvestorDto) { return this.service.save(body as unknown as Record<string, string>); }
}
