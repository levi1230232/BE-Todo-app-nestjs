import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshToken(token);
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
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }
  @Post('forgot-password')
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
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Resets the user password using a valid password reset token.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      example: {
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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
}
