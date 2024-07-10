import { type gmail_v1, google } from "googleapis";
import { GmailError } from "~/errors";

type Gmail = gmail_v1.Gmail;
type RawMessage = gmail_v1.Schema$Message;

export interface Message {
  id: string | null | undefined;
  date: string | null | undefined;
  subject: string | null | undefined;
  sender: string | null | undefined;
  body: string | null | undefined;
}

const authenticatedUser = "me"; // "me" indicates authenticated user in Gmail API

export const gmailService = {
  fetchMessages: async (
    accessToken: string,
    startDate?: Date,
    query?: string,
  ): Promise<Message[]> => {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: "v1", auth });

      const res = await gmail.users.messages.list({
        userId: authenticatedUser,
        q: query ?? startDate ? `after:${startDate!.valueOf()}` : undefined,
      });

      const messagesWithIds = (res.data.messages ?? []).filter(
        (message): message is { id: string } => typeof message.id === "string",
      );

      const messages = (
        await Promise.all(
          messagesWithIds.map(async (message) => getMessage(gmail, message.id)),
        )
      ).filter((message): message is Message => message !== null);

      return messages;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching messages:", error.message);
        throw new GmailError(`Error fetching messages: ${error.message}`);
      } else {
        console.error("Unknown error fetching messages");
        throw new GmailError("Unknown error fetching messages");
      }
    }
  },
};

const getMessage = async (
  gmail: Gmail,
  messageId: string,
): Promise<Message> => {
  try {
    const message = await gmail.users.messages.get({
      userId: authenticatedUser,
      id: messageId,
    });
    return parseMessage(message.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching message ${messageId}:`, error.message);
      throw new GmailError(`Error fetching message: ${error.message}`);
    } else {
      console.error(`Unknown error fetching message ${messageId}`);
      throw new GmailError(`Unknown error fetching message ${messageId}`);
    }
  }
};

const parseMessage = (message: RawMessage): Message => {
  const headers = message.payload?.headers ?? [];
  const subject = headers.find((header) => header.name === "Subject")?.value;
  const sender = headers.find((header) => header.name === "From")?.value;

  let body = "";
  if (message.payload?.parts) {
    const part = message.payload.parts.find(
      (part) => part.mimeType === "text/plain",
    );
    if (part?.body?.data) {
      body = Buffer.from(part.body.data, "base64").toString("utf-8");
    }
  } else if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
  }

  return {
    id: message.id,
    date: message.internalDate,
    subject,
    sender,
    body,
  };
};
