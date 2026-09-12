import { Module } from "@nestjs/common";
import { SimulationController } from "./simulation.controller";
import { SimulationService } from "./simulation.service";
import { MarketModule } from "./market.module";

@Module({ imports: [MarketModule], controllers: [SimulationController], providers: [SimulationService] })
export class SimulationModule {}
