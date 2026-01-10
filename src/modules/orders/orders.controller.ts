import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  async createOrder(
    @Request() req,
    @Body() body: { cartItemIds: string[]; shippingAddressId: string },
  ) {
    return this.ordersService.createOrder(
      req.user.id,
      body.cartItemIds,
      body.shippingAddressId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  async getOrders(@Request() req) {
    return this.ordersService.getOrders(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrderById(@Request() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, req.user.id);
  }
}

