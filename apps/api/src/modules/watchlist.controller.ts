import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { WatchlistService } from "./watchlist.service";
@Controller("watchlist")
export class WatchlistController {
  constructor(private readonly service: WatchlistService) {}
  @Get() list(@Query("userId") userId: string) { return this.service.list(userId); }
  @Post(":symbol") toggle(@Param("symbol") symbol: string, @Query("userId") userId: string) { return this.service.toggle(symbol, userId); }
}
