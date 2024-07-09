import { google } from "googleapis";

export interface Message {
  id: string;
  subject: string;
  sender: string;
  body: string | null;
}

export const gmailService = {
  fetchMessages: async (
    accessToken: string,
    startDate: string,
  ): Promise<Message[] | undefined> => {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth });

      const res = await gmail.users.messages.list({
        userId: "me", // authenticated user shorthand
        q: `after:${Math.floor(new Date(startDate).getTime() / 1000)}`,
      });

      const messages = res.data.messages ?? [];

      messages.forEach(async (message) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
        });
      });
      f;

      const fullMessages = await Promise.all(
        messages.map(async (message) => {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
          });
          return msg.data;
        }),
      );

      return fullMessages as Message[];
    } catch (error) {
      console.error(error);
    }
  },
};
