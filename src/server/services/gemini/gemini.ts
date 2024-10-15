import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "~/env";
import { GEMINI_MODEL } from "~/lib/constants";
import { GeminiError } from "~/lib/errors";

import { type ClassifiedMessage, type Message } from "../../models/message";
import { type Result } from "../../models/result";
import { type Role } from "../../models/role";
import {
  GEMINI_MESSAGE_CLASSIFIER_PROMPT,
  GEMINI_MESSAGE_CLASSIFIER_RESPONSE_SCHEMA,
  GEMINI_ROLE_EXTRACTOR_PROMPT,
  GEMINI_ROLE_EXTRACTOR_RESPONSE_SCHEMA,
} from "./schema";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const messageClassifer = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: GEMINI_MESSAGE_CLASSIFIER_RESPONSE_SCHEMA,
  },
});

const roleExtractor = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: GEMINI_ROLE_EXTRACTOR_RESPONSE_SCHEMA,
  },
});

const geminiService = {
  classifyMessages: async (
    messages: Message[],
  ): Promise<Result<Message[] | undefined, Error>> => {
    try {
      const result = await messageClassifer.generateContent(
        `${GEMINI_MESSAGE_CLASSIFIER_PROMPT} 
        
        ${JSON.stringify(
          messages.map(({ id, snippet, subject, sender }) => ({
            id,
            snippet,
            subject,
            sender,
          })),
        )}`,
      );

      const classifiedMessages = JSON.parse(
        result.response.text(),
      ) as ClassifiedMessage[];

      const classifiedMessageMap = new Map(
        classifiedMessages.map((classifiedMessage) => [
          classifiedMessage.id,
          classifiedMessage.isJobApplicationRelated,
        ]),
      );

      const filteredMessages = messages.filter((message) =>
        classifiedMessageMap.get(message.id),
      );

      return filteredMessages.length
        ? { success: true, data: filteredMessages }
        : { success: true, data: undefined };
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error classifying messages:", error.message);
        return {
          success: false,
          error: new GeminiError(
            `Error classifying messages: ${error.message}`,
          ),
        };
      } else {
        console.error("Unknown error classifying messages");
        return {
          success: false,
          error: new GeminiError("Unknown error classifying messages"),
        };
      }
    }
  },
  extractRoles: async (messages: Message[]): Promise<Result<Role[], Error>> => {
    try {
      const result = await roleExtractor.generateContent(
        `${GEMINI_ROLE_EXTRACTOR_PROMPT} 
        
        ${JSON.stringify(
          messages.map(({ id, snippet, subject, sender, body }) => ({
            id,
            snippet,
            subject,
            sender,
            body,
          })),
        )}`,
      );

      const res = JSON.parse(result.response.text()) as Role[];

      for (const role of res) {
        console.log(role);
      }

      return {
        success: true,
        data: JSON.parse(result.response.text()) as Role[],
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error extracting roles:", error.message);
        return {
          success: false,
          error: new GeminiError(`Error extracting roles: ${error.message}`),
        };
      } else {
        console.error("Unknown error extracting roles");
        return {
          success: false,
          error: new GeminiError("Unknown error extracting roles"),
        };
      }
    }
  },
};

export default geminiService;
