import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './guards/jwt.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ForgotPasswordDto } from './dto/forgotpassword.dto';
import { ResetPasswordDto } from './dto/changepassword.dto';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({
    default: {
      ttl: 60 * 60_000,
      limit: 100,
    },
  })
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with the provided information.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({
    default: { ttl: 60_000, limit: 5 },
  })
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates a user and returns an access token and refresh token.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password.',
  })
  login(
    @Body() dto: LoginDto,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, req.ip, req.headers['user-agent'], res);
  }

  @Post('refresh')
  @Throttle({
    default: { ttl: 60_000, limit: 5 },
  })
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token.',
  })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       refreshToken: {
  //         type: 'string',
  //         example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  //       },
  //     },
  //     required: ['refreshToken'],
  //   },
  // })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
    return this.authService.refreshToken(req.cookies.refreshToken, res);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logs out the authenticated user and invalidates the stored refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.user.sid, res);
  }

  @Post('forgot-password')
  @Throttle({
    default: {
      ttl: 15 * 60_000,
      limit: 3,
    },
  })
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Sends a password reset link to the specified email address if an account exists.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    examples: {
      example: {
        value: {
          email: 'john@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a password reset link has been sent.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({
    default: {
      ttl: 15 * 60_000,
      limit: 5,
    },
  })
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Resets the user password using a valid password reset token.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      example: {
        value: {
          token: 'd8a8f1181f...',
          password: 'NewPassword123@',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset successfully.',
  })
  @ApiBadRequestResponse({
    description: 'The reset token is invalid or has expired.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout-all')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout all devices',
    description: 'Revokes all active sessions of the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  logoutAll(@Req() req, @Res({ passthrough: true }) res: Response) {
    console.log(req.user);
    return this.authService.logoutAll(req.user.id, res);
  }
}
