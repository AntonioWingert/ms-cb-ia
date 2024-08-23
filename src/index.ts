import {
  GoogleGenerativeAI,
  GoogleGenerativeAIResponseError,
} from '@google/generative-ai';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

interface ConversationState {
  [key: string]: { sender: 'user' | 'bot'; message: string }[];
}

export async function connectToWhatsApp() {
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: `Respire fundo e siga os passos abaixo com calma
      
      Função:
      Voce é um assistente virtual da barbearia corta tudo, especializado em ajudar clientes com informações, agendamentos e dúvidas sobre os serviços oferecidos.

      Tarefa:
      Seu objetivo é fornecer informações, responder perguntas frequentes e ajudar os clientes a agendar cortes e verificar a disponibilidade de horários e dias.

      Contexto:
      Somos a barbearia corta tudo, uma barbearia dedicada a oferecer os melhores cortes de cabelo e barba da região.
      Nosso objetivo é proporcionar uma experiencia tranquila e satisfatoria, desde o primeiro contato até o final do corte, com um atendimento personalizado e atenção aos detalhes.

      Instruções:
      1. Seja sempre educado, amigável e direto. Inicie a conversa dando boas-vindas e apresentando a barbearia.
      2. Forneça informações claras e concisas sobre os serviços oferecidos.
      3. Ajude os clientes a agendar os cortes. Sempre peça o nome do cliente, o serviço desejado, o dia e a hora que ele gostaria de agendar e não finalize até o cliente fornecer todos os dados.
      4. Esclareça qualquer dúvida sobre os procedimentos de agendamento e os serviços oferecidos.
      5. Caso o cliente queira alterar a data ou tenha dúvidas sobre a disponibilidade de horários, ofereça alternativas.
      6. Sempre confirme com o usuário se a data e hora que você formatou estão corretas, não finalize o agendamento até o cliente confirmar todos os dados.

      Não esqueça:
      - Mantenha a conversa amigável e informativa.
      - Certifique-se de coletar todas as informações necessárias antes de finalizar o agendamento.
      - Sempre verifique a disponibilidade de horários antes de oferecer alternativas.

      Informações sobre a barbearia
      - A barbearia fica localizada na rua praça é nossa, cruzamento com rua de baixo, em frente ao mercado do sal grosso.
      - O número da barbearia é 46999123456.
      - Nós possuimos 3 estilos de corte de cabelo, sendo eles:
        - Social, no valor de 25 reais.
        - A moda da casa, no valor de 25 reais.
        - Degrade, no valor de 30 reais.
      - O valor de corte para a barba é de 10 reais fixo.
      - O horário de funcionamento é de segunda a sexta, das 9h às 12h e das 13:30h às 18h e aos sábados das 9h às 13h sem pausa para almoço.
      `,
  });
  const conversationState: ConversationState = {};

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
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
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('opened connection');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const message = messages[0];
    if (!message.message || !message.key.remoteJid) {
      return;
    }

    if (message.key.remoteJid.split('@')[1] === 'g.us') return;

    // if (message.key.fromMe) return;

    const data = await fetch(
      'http://localhost:5678/webhook/73b382dc-e678-49d6-a31a-7b5e41ce1236',
    );
    const dataJson = await data.json();

    const schedules = JSON.parse(dataJson[0].response);

    function formatScheduleDataToString(scheduleData: []) {
      return scheduleData
        .map((item: any) => {
          const startDate = new Date(item.start);
          const endDate = new Date(item.end);

          return `Início: ${startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}\nFim: ${endDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}`;
        })
        .join('\n\n');
    }

    const formattedSchedules = formatScheduleDataToString(schedules);

    const schedulePrompt = `
    1. Verifique a disponibilidade de horários com base no horário de funcionamento e no horário atual do dia.
    2. Os horários INDISPONIVEIS são: ${formattedSchedules}, envie o restante dos horarios disponiveis, cada um com 30 minutos de duração.
    3. Sempre que o cliente quiser saber a respeito dos horarios envie o mais rapido possivel, respeitando o horario do dia e de funcionamento.
    `;

    const userId = message.key.remoteJid!;
    const userMessage =
      message.message.conversation || message.message.extendedTextMessage?.text;

    if (!conversationState[userId]) {
      conversationState[userId] = [];
    }

    const context = conversationState[userId]
      .map(
        (entry) =>
          `${entry.sender === 'user' ? 'Usuário' : 'Bot'}: ${entry.message}`,
      )
      .join('\n');

    if (userMessage) {
      try {
        const result = await model.generateContent({
          contents: [
            { role: 'model', parts: [{ text: schedulePrompt }] },
            { role: 'model', parts: [{ text: context }] },
            { role: 'user', parts: [{ text: userMessage }] },
          ],
        });

        const botResponse = result.response.text();

        conversationState[userId].push({
          sender: 'user',
          message: userMessage,
        });
        conversationState[userId].push({ sender: 'bot', message: botResponse });

        console.log(botResponse);

        // await sock.sendMessage(userId, {
        //   text: botResponse,
        // });
      } catch (error) {
        if (error instanceof GoogleGenerativeAIResponseError) {
          console.error('GoogleGenerativeAI Error:', error.message);
          await sock.sendMessage(message.key.remoteJid!, {
            text: 'Desculpe, não posso processar essa solicitação devido a preocupações de segurança.',
          });
        } else if (error.message === 'Request timed out') {
          console.error('Erro de timeout:', error.message);
          await sock.sendMessage(userId, {
            text: 'Desculpe, a solicitação demorou muito para ser processada. Por favor, tente novamente mais tarde.',
          });
        } else {
          console.error('Erro inesperado:', error);
          await sock.sendMessage(message.key.remoteJid!, {
            text: 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.',
          });
        }
      }
    }
  });
}
