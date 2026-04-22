import { TicketStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimIfString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  toStatus!: TicketStatus;

  @Transform(trimIfString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
