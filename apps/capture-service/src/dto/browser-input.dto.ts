import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { BrowserInputRequest } from '@veridit/contracts';

export class BrowserInputDto {
  @IsIn(['click', 'wheel', 'key', 'text'])
  type!: BrowserInputRequest['type'];

  @ValidateIf((input: BrowserInputDto) => input.type === 'click')
  @IsInt()
  @Min(0)
  x?: number;

  @ValidateIf((input: BrowserInputDto) => input.type === 'click')
  @IsInt()
  @Min(0)
  y?: number;

  @ValidateIf((input: BrowserInputDto) => input.type === 'wheel')
  @IsNumber()
  deltaX?: number;

  @ValidateIf((input: BrowserInputDto) => input.type === 'wheel')
  @IsNumber()
  deltaY?: number;

  @ValidateIf((input: BrowserInputDto) => input.type === 'key')
  @IsString()
  @IsNotEmpty()
  key?: string;

  @ValidateIf(
    (input: BrowserInputDto) =>
      input.type === 'key' && input.code !== undefined,
  )
  @IsString()
  code?: string;

  @ValidateIf(
    (input: BrowserInputDto) =>
      input.type === 'key' && input.ctrlKey !== undefined,
  )
  @IsBoolean()
  ctrlKey?: boolean;

  @ValidateIf(
    (input: BrowserInputDto) =>
      input.type === 'key' && input.shiftKey !== undefined,
  )
  @IsBoolean()
  shiftKey?: boolean;

  @ValidateIf(
    (input: BrowserInputDto) =>
      input.type === 'key' && input.altKey !== undefined,
  )
  @IsBoolean()
  altKey?: boolean;

  @ValidateIf(
    (input: BrowserInputDto) =>
      input.type === 'key' && input.metaKey !== undefined,
  )
  @IsBoolean()
  metaKey?: boolean;

  @ValidateIf((input: BrowserInputDto) => input.type === 'text')
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value?: string;
}
