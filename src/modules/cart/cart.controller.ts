import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(
    @Request() req,
    @Body() body: { itemId: number; quantity?: number },
  ) {
    return this.cartService.addToCart(req.user.id, body.itemId, body.quantity || 1);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateQuantity(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateQuantity(id, req.user.id, body.quantity);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeFromCart(@Request() req, @Param('id') id: string) {
    return this.cartService.removeFromCart(id, req.user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }
}

