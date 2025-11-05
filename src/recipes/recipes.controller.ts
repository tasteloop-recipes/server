/* eslint-disable-next-line @typescript-eslint/no-redeclare */
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { PaginatedRecipes } from './recipes.service';
import { RecipesService } from './recipes.service';
import { Recipe } from '@prisma/client';
import { CreateRecipeDto } from './create-recipe.dto';
import { RateLimitGuard } from './rate-limit.guard';

@Controller('recipes')
@UseGuards(RateLimitGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async getRecipes(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedRecipes> {
    return this.recipesService.findAll(page, limit);
  }

  @Get(':id')
  async getRecipeById(@Param('id') id: string): Promise<Recipe> {
    return this.recipesService.findOne(id);
  }

  @Post()
  async createRecipe(@Body() body: CreateRecipeDto): Promise<Recipe> {
    return this.recipesService.create(body.prompt);
  }
}
