import { Module } from "@nestjs/common";
import { ThesisController } from "./thesis.controller";
import { ThesisService } from "./thesis.service";
import { MarketModule } from "./market.module";

@Module({ imports: [MarketModule], controllers: [ThesisController], providers: [ThesisService] })
export class ThesisModule {}
