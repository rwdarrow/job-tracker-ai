import { type Message } from "~/server/models/message";
import { type Result } from "~/server/models/result";

export interface FetchMessagesParams {
  afterDate: Date;
}

export interface EmailService<
  T extends FetchMessagesParams = FetchMessagesParams,
> {
  fetchMessages(params: T): Promise<Result<Message[] | undefined>>;
}

export type EmailServiceConstructor = new () => EmailService;

export const createEmailService = (
  serviceConstructor: EmailServiceConstructor,
): EmailService => {
  return new serviceConstructor();
};
