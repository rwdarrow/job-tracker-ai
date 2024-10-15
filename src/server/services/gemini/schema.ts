import { SchemaType } from "@google/generative-ai";
import { enumToString } from "~/lib/utils";
import { Status } from "~/server/models/role";

export const GEMINI_MESSAGE_CLASSIFIER_RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: {
        type: SchemaType.STRING,
        description: "The message ID as provided in the input for this message",
      },
      isJobApplicationRelated: {
        type: SchemaType.BOOLEAN,
        description: "Whether or not the message relates to a job application",
      },
    },
  },
};
export const GEMINI_ROLE_EXTRACTOR_RESPONSE_SCHEMA = {
  description:
    "Job information extracted from email data. There will only be one job per email",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: {
        type: SchemaType.STRING,
        description: "The message ID as provided in the input",
      },
      title: {
        type: SchemaType.STRING,
        description:
          "The job title as found in the subject and/or body, e.g. Software Engineer, Software Enginer - 1234567, Software Engineer (1234567). Include any identifying numbers that appear alongside the job title",
      },
      status: {
        type: SchemaType.STRING,
        description: `The current status of the application. Should be apparent from the subject and/or body. The possible statuses are ${enumToString(Status)}. Some emails may be from the employer, but are not job application updates. If this is the case, choose NOT_APPLICABLE`,
      },
      statusConfidence: {
        type: SchemaType.NUMBER,
        description:
          "A value between 0 and 1 incidating the level of confidence in the choice of the 'status' property",
      },
      contacts: {
        type: SchemaType.ARRAY,
        description:
          "An array of contacts. Include if there are explicitly mentioned names in the message, such as recruiters or a hiring manager, along with a corresponding email address (which may or may not differ from the sender address)",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            email: {
              type: SchemaType.STRING,
              description:
                "The email address of the contact, e.g. john.doe@company.com",
            },
            name: {
              type: SchemaType.STRING,
              description: "The name of the contact, e.g. John Doe",
            },
            title: {
              type: SchemaType.STRING,
              description: "The job title of the contact",
            },
          },
        },
      },
      company: {
        type: SchemaType.OBJECT,
        description:
          "Information about the company the candidate is applying to. Ensure that this is the actual target company of the job application, not other companies mentioned in the email, especially job boards or CMS systems like LinkedIn, Workday, Success Factors, etc.",
        properties: {
          name: {
            type: SchemaType.STRING,
            description:
              "The name of the company. e.g. Google. If you think it is LinkedIn, it probably isn't. Only assume it is LinkedIn if the contents of the email make it clear that the job itself at LinkedIn",
          },
          domain: {
            type: SchemaType.STRING,
            description:
              "The domain of the company, e.g. google.com. Ensure that this is the actual target company of the job application, especially job boards or CMS systems like LinkedIn, Workday, Success Factors, etc. If the domain is explicitly mentioned in the body or subject of the message (e.g., 'Visit our careers page at careers.dteenergy.com'), use that. Otherwise, if it is not in the sender email and cannot be reliably inferred from the company name, leave this property blank.",
          },
        },
        required: ["name", "domain"],
      },
    },
    required: ["id", "title", "status", "statusConfidence", "company"],
  },
};

export const GEMINI_MESSAGE_CLASSIFIER_PROMPT =
  "Given these emails represented in JSON format, determine whether or not each message relates to a job application:";
export const GEMINI_ROLE_EXTRACTOR_PROMPT =
  "Given these emails represented in JSON format, extract application information into the provided schema:";
