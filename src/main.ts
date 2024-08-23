import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WhatsappService } from './modules/whatsapp/whatsapp.service';
import { GenerativeAiService } from './modules/generativeAi/generativeAi.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const whatsappService = app.get(WhatsappService);
  const generativeAiService = app.get(GenerativeAiService);

  await whatsappService.connectToWhatsapp();
  await generativeAiService.createGenerativeModel();

  await app.listen(3000);
}
bootstrap();
