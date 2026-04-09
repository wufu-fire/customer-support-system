import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trimIfString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTicketDto {
  @Transform(trimIfString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName!: string;

  @Transform(trimIfString)
  @IsEmail()
  @MaxLength(255)
  customerEmail!: string;

  @Transform(trimIfString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerPhone?: string;

  @Transform(trimIfString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderRefNo?: string;

  @Transform(trimIfString)
  @IsOptional()
  @IsUUID()
  productId?: string;

  @Transform(trimIfString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  productName!: string;

  @Transform(trimIfString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  issueType!: string;

  @Transform(trimIfString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  issueDescription!: string;
}
