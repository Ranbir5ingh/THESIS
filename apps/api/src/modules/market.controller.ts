import { Controller, Get, Param, Query } from "@nestjs/common";
import { MarketService } from "./market.service";

@Controller("assets")
export class MarketController {
  constructor(private readonly market: MarketService) {}
  @Get("search") search(@Query("q") q?: string) { return this.market.search(q); }
  @Get(":symbol") asset(@Param("symbol") symbol: string) { return this.market.getAsset(symbol); }
  @Get(":symbol/analysis") analysis(@Param("symbol") symbol: string) { return this.market.analysis(symbol); }
  @Get(":symbol/chart") chart(@Param("symbol") symbol: string) { return this.market.chart(symbol); }
}
