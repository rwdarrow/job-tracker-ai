import {
  FunctionDeclarationSchemaType,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { env } from "~/env";
import { type Message } from "../models/message";
import { Status } from "../models/role";
import { enumToString } from "../utils";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const classifyMessagesFunctionDeclaration = {
  name: "classifyMessages",
  description:
    "Determine whether or not an email message is a job application status update from a potential employer",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      messages: {
        type: FunctionDeclarationSchemaType.ARRAY,
        description: "A list of email messages",
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            messageId: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "The server ID of the message",
            },
            sender: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The sender email address, e.g. john.doe@company.com",
            },
            subject: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The message subject, e.g. 'Thank you for applying to Company' or 'An update on your application to Company'",
            },
          },
          required: ["messageId", "sender", "subject"],
        },
      },
    },
    required: ["messages"],
  },
};

const messageClassifer = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          messageId: {
            type: FunctionDeclarationSchemaType.STRING,
            description: "The ID as provided in the input",
          },
          isJobApplicationRelated: {
            type: FunctionDeclarationSchemaType.BOOLEAN,
            description:
              "Whether or not the message is a job application status update from a potential employer",
          },
        },
      },
    },
  },
  tools: [
    {
      functionDeclarations: [classifyMessagesFunctionDeclaration],
    },
  ],
});

const extractRolesFunctionDeclaration = {
  name: "classifyMessage",
  description: "Extracts a role from the message contents",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      messages: {
        type: FunctionDeclarationSchemaType.ARRAY,
        description: "A list of email messages",
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            messageId: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "The server ID of the message",
            },
            sender: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The sender email address, e.g. john.doe@company.com",
            },
            subject: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The message subject, e.g. 'Thank you for applying to Company' or 'An update on your application to Company'",
            },
            body: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The message body, e.g. 'Thank you applying interest in Company. We have received your application for the Software Engineer role and will reach out when we have an update.",
            },
          },
          required: ["messageId", "sender", "subject", "body"],
        },
      },
    },
    required: ["messages"],
  },
};

const roleExtractor = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          messageId: {
            type: FunctionDeclarationSchemaType.STRING,
            description: "The ID as provided in the input",
          },
          title: {
            type: FunctionDeclarationSchemaType.STRING,
            description:
              "The job title as found in the subject and/or body, e.g. Software Engineer. If there is a requisition number or other identifying number after the title or elsewhere in the message, that should be not be included here",
          },
          requisitionNumber: {
            type: FunctionDeclarationSchemaType.STRING,
            description:
              "The role requistion number (or other identifying number) as found in the subject and/or body, e.g. 285343. Set to an empty string if there is none present",
          },
          status: {
            type: FunctionDeclarationSchemaType.STRING,
            description: `The current status of the application. Should be apparent from the subject and/or body. The possible statuses are ${enumToString(Status)}. If none of the options seems to fit, choose the best fit. Some emails may be from the employer, but are not job application updates. If this is the case, choose any random option`,
          },
          statusConfidence: {
            type: FunctionDeclarationSchemaType.NUMBER,
            description:
              "A value between 0 and 1 incidating the level of confidence in the choice of the 'status' property. A value of zero means that the status could not be determined, either because the email is irrelevant, or is from the employer, but not directly related to job application status",
          },
          contacts: {
            type: FunctionDeclarationSchemaType.ARRAY,
            description:
              "An array of contacts. This property should only be included if there are explicitly mentioned names in the message, such as recruiters or a hiring manager, along with a corresponding email address (which may or may not differ from the sender address)",
            items: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                email: {
                  type: FunctionDeclarationSchemaType.STRING,
                  description:
                    "The email address of the contact, e.g. jone.doe@company.com",
                },
                name: {
                  type: FunctionDeclarationSchemaType.STRING,
                  description: "The name of the contact, e.g. John Doe",
                },
                title: {
                  type: FunctionDeclarationSchemaType.STRING,
                  description:
                    "The job title of the contact. Set to an empty string if there is none present",
                },
              },
            },
          },
          company: {
            type: FunctionDeclarationSchemaType.OBJECT,
            description:
              "An array of contacts. This property should only be included if there are explicitly mentioned names in the message, such as recruiters or a hiring manager, along with a corresponding email address (which may or may not differ from the sender address)",
            items: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                name: {
                  type: FunctionDeclarationSchemaType.STRING,
                  description: "The name of the company. e.g. Google",
                },
                domain: {
                  type: FunctionDeclarationSchemaType.STRING,
                  description:
                    "The domain name of company, e.g. google.com. Only include if it is part of the sender's email address, or explicitly written in the body or subject of the message. Set to an empty string if there is none present",
                },
              },
            },
          },
        },
      },
    },
  },
  tools: [
    {
      functionDeclarations: [extractRolesFunctionDeclaration],
    },
  ],
});

export const geminiService = {
  classifyMessages: async (messages: Message[]) => {
    return await messageClassifer.generateContent(
      `Follow provided schema: ${JSON.stringify(messages)}`,
    );
  },
  extractRoles: async (messages: Message[]) => {
    return await roleExtractor.generateContent(
      `Follow provided schema: ${JSON.stringify(messages)}`,
    );
  },
};
