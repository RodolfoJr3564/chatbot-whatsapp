import { PartialType } from '@nestjs/mapped-types';
import { CreateWhatsappAdapterDto } from './create-whatsapp-adapter.dto';

export class UpdateWhatsappAdapterDto extends PartialType(CreateWhatsappAdapterDto) {}
