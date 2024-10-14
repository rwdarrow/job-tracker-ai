import { format } from "date-fns";
import { type gmail_v1, google } from "googleapis";
import pThrottle from "p-throttle";
import { env } from "~/env";
import {
  GMAIL_API_DATE_FORMAT,
  GMAIL_API_GET_MESSAGE_RATE_LIMIT,
  GMAIL_API_LIST_MESSAGE_MAX_RESULTS,
  GMAIL_API_PER_USER_RATE_LIMIT_MS,
} from "~/lib/constants";
import { GmailError } from "~/lib/errors";

import { type Message } from "../../models/message";
import { type Result } from "../../models/result";
import { type EmailService, type FetchMessagesParams } from "./base";

type RawMessage = gmail_v1.Schema$Message;
type ListMessagesParams = gmail_v1.Params$Resource$Users$Messages$List;

export default class GmailService implements EmailService<FetchMessagesParams> {
  private readonly _email;
  private readonly _auth;
  private readonly _gmail;

  constructor(email: string, refreshToken: string) {
    this._email = email;
    this._auth = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
    );
    this._auth.setCredentials({ refresh_token: refreshToken });
    this._gmail = google.gmail({ version: "v1", auth: this._auth });
  }

  public fetchMessages = async (
    params: FetchMessagesParams,
  ): Promise<Result<Message[] | undefined, Error>> => {
    try {
      const { afterDate } = params;

      const listMessages = [];
      let nextPageToken: string | null | undefined;

      // performance optimization: this setting is not exposed by the API but can be checked
      // manually. Can potentially greatly reduce the number of API calls if it is set
      const userHasInboxCategories = await this._getUserHasInboxCategories();
      const q = `after:${format(afterDate, GMAIL_API_DATE_FORMAT)} ${userHasInboxCategories && "category: primary"}`;
      do {
        const requestOptions: ListMessagesParams = {
          userId: this._email,
          maxResults: GMAIL_API_LIST_MESSAGE_MAX_RESULTS,
          q,
        };

        if (nextPageToken) {
          requestOptions.pageToken = nextPageToken;
        }

        const res = await this._gmail.users.messages.list(requestOptions);
        nextPageToken = res.data.nextPageToken;

        if (res.data.messages) {
          listMessages.push(...res.data.messages);
        }
      } while (nextPageToken);

      // skip further processing if there are no new emails
      if (!listMessages.length) return { success: true, data: undefined };

      console.log(listMessages.length);

      // google insists that it's somehow possible to receive a valid list message response
      // with an undefined ID.........
      const messagesWithIds = (listMessages ?? []).filter(
        (message): message is { id: string } => typeof message.id === "string",
      );

      const throttle = pThrottle({
        limit: GMAIL_API_GET_MESSAGE_RATE_LIMIT,
        interval: GMAIL_API_PER_USER_RATE_LIMIT_MS,
      });

      const getMessageThrottled = throttle(this._getMessage);

      const messages = (
        await Promise.all(
          messagesWithIds.map(
            async (message) => await getMessageThrottled(message.id),
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
  };

  private _getUserHasInboxCategories = async (): Promise<boolean> => {
    const categoryMessages = await this._gmail.users.messages.list({
      userId: this._email,
      maxResults: 1,
      q: "category: primary",
    });

    if (!categoryMessages.data.messages) {
      throw new GmailError("Could not fetch inbox categories");
    }

    return categoryMessages.data.messages?.length > 0;
  };

  private _getMessage = async (messageId: string): Promise<Message> => {
    try {
      const message = await this._gmail.users.messages.get({
        userId: this._email,
        id: messageId,
      });

      return this._parseMessage(message.data);
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

  private _parseMessage = (message: RawMessage): Message => {
    if (!message.id) throw new GmailError("Message ID is undefined");

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
      snippet: message.snippet,
      subject,
      sender,
      body,
    };
  };
}
