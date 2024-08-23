import { Injectable } from '@nestjs/common';

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { GenerativeAiService } from '../generativeAi/generativeAi.service';
import { ScheduleService } from '../schedules/schedule.service';

@Injectable()
export class WhatsappService {
  private conversationState: { [key: string]: any[] } = {};
  private context = '';
  private schedules = '';
  constructor(
    private readonly aiService: GenerativeAiService,
    private readonly scheduleService: ScheduleService,
  ) {}

  async connectToWhatsapp() {
    const { state, saveCreds } =
      await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;
        console.log(
          'connection closed due to ',
          lastDisconnect.error,
          ', reconnecting ',
          shouldReconnect,
        );

        if (shouldReconnect) {
          this.connectToWhatsapp();
        }
      } else if (connection === 'open') {
        console.log('opened connection');
      }
    });
    sock.ev.on('messages.upsert', ({ messages }) => {
      this.handleMessages(messages, sock);
    });
  }

  async handleMessages(messages: WAMessage[], sock: any) {
    const message = messages[0];

    if (!message.message || !message.key.remoteJid) return;

    if (message.key.remoteJid.split('@')[1] === 'g.us') return;

    if (message.key.fromMe) return;

    const userId = message.key.remoteJid!;
    const userMessage =
      message.message.conversation || message.message.extendedTextMessage?.text;

    if (!userId || !userMessage) {
      return;
    }

    if (!this.conversationState[userId]) {
      this.conversationState[userId] = [];
    }

    if (userMessage === '!horarios') {
      return this.sendScheduledMessage(userId, sock);
    }

    if (userMessage) {
      return this.sendBotMessage(userId, userMessage, sock);
    }
  }

  async sendBotMessage(userId: string, message: string, sock: any) {
    try {
      const result = await this.aiService.generateResponse({
        contents: [
          { role: 'model', parts: [{ text: this.getContext() }] },
          { role: 'user', parts: [{ text: message }] },
        ],
      });

      const botResponse = result.response.text();

      this.saveConversationState(userId, botResponse, message);

      await sock.sendMessage(userId, {
        text: botResponse,
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
    }
  }

  async getScheduleData() {
    const schedules = await this.scheduleService.getSchedules();
    this.schedules = schedules;
  }

  async sendScheduledMessage(userId: string, sock: any) {
    try {
      await this.getScheduleData();

      this.saveConversationState(userId, this.schedules);

      await sock.sendMessage(userId, {
        text: this.schedules,
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
    }
  }

  async saveConversationState(
    userId: string,
    botResponse: string,
    userMessage?: string,
  ) {
    this.conversationState[userId].push({
      sender: 'user',
      message: userMessage,
    });
    this.conversationState[userId].push({
      sender: 'bot',
      message: botResponse,
    });
    this.context = this.conversationState[userId]
      .map(
        (entry) =>
          `${entry.sender === 'user' ? 'Usuário' : 'Bot'}: ${entry.message}`,
      )
      .join('\n');
  }

  getContext() {
    return this.context;
  }
}
