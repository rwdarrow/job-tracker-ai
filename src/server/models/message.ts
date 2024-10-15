export interface Message {
  id: string;
  date: string | null | undefined;
  snippet: string | null | undefined;
  subject: string | null | undefined;
  sender: {
    name: string | null | undefined;
    address: string | null | undefined;
  };
  body: string | null | undefined;
}

export interface ClassifiedMessage {
  id: string;
  isJobApplicationRelated: boolean;
}
