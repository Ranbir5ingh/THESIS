import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import { MarketService } from "./market.service";
@Controller("assets")
export class MarketController {
  constructor(private readonly m: MarketService) {}
  @Get("search") search(@Query("q") q?: string) { return this.m.search(q); }
  @Get("batch") batch(@Query("symbols") symbols?: string, @Query("userId") userId?: string) { return this.m.batch(String(symbols ?? "").split(",").map(s => s.trim()).filter(Boolean), this.validUser(userId)); }
  @Get(":symbol/analysis") analysis(@Param("symbol") s: string, @Query("userId") userId: string) { return this.m.analysis(s, this.validUser(userId)); }
  @Get(":symbol/bundle") bundle(@Param("symbol") s: string, @Query("userId") userId: string) { return this.m.bundle(s, this.validUser(userId)); }
  @Get(":symbol/chart") chart(@Param("symbol") s: string) { return this.m.chart(s); }
  @Get(":symbol/news") news(@Param("symbol") s: string) { return this.m.news(s); }
  @Get(":symbol") asset(@Param("symbol") s: string) { return this.m.getAsset(s); }
  private validUser(value?: string) { if (!value) throw new BadRequestException("userId is required"); return value; }
}
