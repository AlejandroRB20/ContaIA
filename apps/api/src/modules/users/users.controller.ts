import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import type { RequestUser } from '../../common/interfaces/request-context.interface';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
@UseGuards(AuthenticationGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado y sus membresias' })
  async getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar el perfil del usuario autenticado' })
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(user.id, dto);
  }
}
