import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'dev_only_fallback_jwt_secret_replace_in_production_32b',
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as '15m',
      },
    }),
  ],
  providers: [PrismaService, JwtAuthGuard, RolesGuard],
  exports: [PrismaService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class CommonModule {}

