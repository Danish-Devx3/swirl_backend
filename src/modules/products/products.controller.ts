import { Controller, Get, Query, Post, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ProductsService, UserPreferences } from './products.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all products with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
        return this.productsService.findAll(Number(page), Number(limit));
    }

    @Get('search')
    @ApiOperation({ summary: 'Search products by query string' })
    @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    search(@Query('q') query: string, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
        return this.productsService.search(query, Number(page), Number(limit));
    }

    @Post('recommend')
    @ApiOperation({ summary: 'Get product recommendations based on user profile (passed in body)' })
    @ApiQuery({ name: 'category', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    recommend(
        @Body() profile: UserPreferences,
        @Query('category') category?: string,
        @Query('limit') limit: number = 10
    ) {
        return this.productsService.recommendProducts(profile, category, Number(limit));
    }

    @Post('recommend/user')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get product recommendations based on logged-in user\'s saved profile' })
    @ApiBody({ schema: { type: 'object', properties: { limit: { type: 'number' }, category: { type: 'string' } } } })
    async recommendUser(
        @Request() req,
        @Query('limit') limit: number = 10,
        @Query('category') category?: string,
    ) {
        const userId = req.user.id;
        return this.productsService.recommendProducts(userId, category, Number(limit));
    }



    @Post('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Save shopper profile for logged-in user' })
    async saveProfile(@Request() req, @Body() profile: UserPreferences) {
        await this.productsService.saveShopperProfile(req.user.id, profile);
        return { message: 'Profile saved successfully' };
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get shopper profile of logged-in user' })
    async getProfile(@Request() req) {
        return this.productsService.getShopperProfile(req.user.id);
    }
}
