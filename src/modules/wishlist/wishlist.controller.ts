import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@Request() req) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to wishlist' })
  async addToWishlist(@Request() req, @Body() body: { itemId: number }) {
    return this.wishlistService.addToWishlist(req.user.id, body.itemId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  async removeFromWishlist(@Request() req, @Param('id') id: string) {
    return this.wishlistService.removeFromWishlist(id, req.user.id);
  }
}

