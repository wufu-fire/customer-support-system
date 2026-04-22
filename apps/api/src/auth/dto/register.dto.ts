import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimIfString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(trimIfString)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MaxLength(10)
  locale?: string;
}
