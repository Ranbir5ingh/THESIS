import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsEmail, IsString } from "class-validator";
import { InvestorService } from "./investor.service";

class InvestorDto {
  @IsEmail() email!: string;
  @IsString() goal!: string;
  @IsString() riskTolerance!: string;
  @IsString() timeHorizon!: string;
  @IsString() knowledgeLevel!: string;
  @IsString() growthPreference!: string;
  @IsString() incomePreference!: string;
}

@Controller("investor-profile")
export class InvestorController {
  constructor(private readonly service: InvestorService) {}
  @Get() get() { return this.service.get(); }
  @Post() save(@Body() body: InvestorDto) { return this.service.save(body as unknown as Record<string, string>); }
}
