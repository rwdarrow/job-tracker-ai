import { format } from "date-fns";
import { type gmail_v1, google } from "googleapis";
import pThrottle from "p-throttle";
import { env } from "~/env";
import config from "~/lib/config";
import { GmailError } from "~/lib/errors";

import { type Message } from "../models/message";
import { type Result } from "../models/result";

type Gmail = gmail_v1.Gmail;
type RawMessage = gmail_v1.Schema$Message;
type ListMessagesParams = gmail_v1.Params$Resource$Users$Messages$List;

export interface FetchMessagesParams {
  userId: string;
  refreshToken: string;
  afterDate?: Date;
  query?: string;
}

export const gmailService = {
  fetchMessages: async (
    params: FetchMessagesParams,
  ): Promise<Result<Message[] | undefined>> => {
    try {
      const { userId, refreshToken, afterDate, query } = params;

      const auth = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
      );
      auth.setCredentials({ refresh_token: refreshToken });

      const gmail = google.gmail({ version: "v1", auth });

      const listMessages = [];
      let nextPageToken: string | null | undefined;

      do {
        const requestOptions: ListMessagesParams = {
          userId,
          maxResults: 500,
          q:
            query ??
            (afterDate
              ? `after:${format(afterDate, config.api.google.gmail.dateFormat)}`
              : undefined),
        };

        if (nextPageToken) {
          requestOptions.pageToken = nextPageToken;
        }

        const res = await gmail.users.messages.list(requestOptions);
        nextPageToken = res.data.nextPageToken;

        if (res.data.messages) {
          listMessages.push(...res.data.messages);
        }
      } while (nextPageToken);

      // skip further processing if there are no new emails
      if (!listMessages.length) return { success: true, data: undefined };

      // google insists that it's somehow possible to receive a valid list message response
      // with an undefined ID.........
      const messagesWithIds = (listMessages ?? []).filter(
        (message): message is { id: string } => typeof message.id === "string",
      );

      const throttle = pThrottle({
        limit: config.api.google.gmail.getMessageRateLimit,
        interval: config.api.google.gmail.perUserRateLimitMs,
      });

      const messages = (
        await Promise.all(
          messagesWithIds.map(
            async (message) =>
              await throttle(getMessage)(userId, gmail, message.id),
          ),
        )
      ).filter((message): message is Message => message !== null);

      return { success: true, data: messages };
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching messages:", error.message);
        return {
          success: false,
          error: new GmailError(`Error fetching messages: ${error.message}`),
        };
      } else {
        console.error("Unknown error fetching messages");
        return {
          success: false,
          error: new GmailError("Unknown error fetching messages"),
        };
      }
    }
  },
};

const getMessage = async (
  userId: string,
  gmail: Gmail,
  messageId: string,
): Promise<Message> => {
  try {
    const message = await gmail.users.messages.get({
      userId,
      id: messageId,
    });

    return parseMessage(message.data);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching message ${messageId}:`, error.message);
      throw new GmailError(
        `Error fetching message ${messageId}: ${error.message}`,
      );
    } else {
      console.error(`Unknown error fetching message ${messageId}`);
      throw new GmailError(`Unknown error fetching message ${messageId}`);
    }
  }
};

const parseMessage = (message: RawMessage): Message => {
  if (!message.id) throw new GmailError("id is undefined");

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
