import { Body, Controller, Post } from "@nestjs/common";
import { IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { SimulationService } from "./simulation.service";
class SimulationDto { @IsString() symbol!: string; @IsNumber() @Min(100) amount!: number; @IsNumber() @Min(1) years!: number; @IsOptional() @IsString() behaviorResponse?: string; @IsUUID() userId!: string; }
@Controller("simulation")
export class SimulationController { constructor(private readonly service: SimulationService) {} @Post() simulate(@Body() body: SimulationDto) { return this.service.simulate(body); } }
