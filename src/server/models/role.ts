export enum Status {
  APPLIED = "APPLIED",
  IN_PROGRESS_RECRUITER_CONTACT = "IN_PROGRESS_RECRUITER_CONTACT",
  IN_PROGRESS_ONLINE_ASSESMENT = "IN_PROGRESS_ONLINE_ASSESMENT",
  IN_PROGRESS_CASE_STUDY = "IN_PROGRESS_CASE_STUDY",
  IN_PROGRESS_INTERVIEW_ROUND_1 = "IN_PROGRESS_INTERVIEW_ROUND_1",
  IN_PROGRESS_INTERVIEW_ROUND_2 = "IN_PROGRESS_INTERVIEW_ROUND_2",
  IN_PROGRESS_INTERVIEW_ROUND_3 = "IN_PROGRESS_INTERVIEW_ROUND_3",
  IN_PROGRESS_INTERVIEW_ROUND_4 = "IN_PROGRESS_INTERVIEW_ROUND_4",
  IN_PROGRESS_INTERVIEW_ROUND_5 = "IN_PROGRESS_INTERVIEW_ROUND_5",
  IN_PROGRESS_INTERVIEW_ROUND_6 = "IN_PROGRESS_INTERVIEW_ROUND_6",
  IN_PROGRESS_INTERVIEW_ROUND_7 = "IN_PROGRESS_INTERVIEW_ROUND_7",
  REJECTED = "REJECTED",
  OFFER_RECEIVED = "OFFER_RECEIVED",
  OFFER_DECLINED = "OFFER_DECLINED",
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
}

export interface Contact {
  id: string;
  email: string;
  name: string;
  title: string;
  company: Company;
}

export interface Role {
  id: string;
  title: string;
  requisitionNumber?: string;
  status: Status;
  lastStatus?: Status;
  statusConfidence: number;
  contacts: Contact[];
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  company: Company;
}
