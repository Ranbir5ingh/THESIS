import { Module } from "@nestjs/common";
import { DbModule } from "./common/db.module";
import { MarketModule } from "./modules/market.module";
import { ThesisModule } from "./modules/thesis.module";
import { InvestorModule } from "./modules/investor.module";
import { WatchlistModule } from "./modules/watchlist.module";
import { SimulationModule } from "./modules/simulation.module";

@Module({
  imports: [DbModule, MarketModule, ThesisModule, InvestorModule, WatchlistModule, SimulationModule],
})
export class AppModule {}
