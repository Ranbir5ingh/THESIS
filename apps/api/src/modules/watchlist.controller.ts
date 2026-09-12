import { Controller, Get, Param, Post } from "@nestjs/common";
import { WatchlistService } from "./watchlist.service";

@Controller("watchlist")
export class WatchlistController {
  constructor(private readonly service: WatchlistService) {}
  @Get() list() { return this.service.list(); }
  @Post(":symbol") toggle(@Param("symbol") symbol: string) { return this.service.toggle(symbol); }
}
