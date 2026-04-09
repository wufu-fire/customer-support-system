import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trimIfString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class TrackTicketDto {
  @Transform(trimIfString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  ticketNo!: string;

  @Transform(trimIfString)
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
