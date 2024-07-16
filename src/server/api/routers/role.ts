import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { Status } from "~/server/models/role";

export const roleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        requisitionNumber: z.string().optional(),
        status: z.nativeEnum(Status),
        statusConfidence: z.number(),
        contacts: z
          .array(
            z.object({
              email: z.string(),
              name: z.string(),
              title: z.string().optional(),
            }),
          )
          .optional(),
        createdAt: z.date(),
        company: z.object({
          name: z.string(),
          domain: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const company = await ctx.db.company.upsert({
        where: { name: input.company.name },
        update: { domain: input.company.domain },
        create: { ...input.company },
      });

      let contactsWithCompanyId;
      if (input.contacts?.length) {
        contactsWithCompanyId = input.contacts.map((contact) => {
          return { ...contact, companyId: company.id };
        });
      }

      const data = {
        title: input.title,
        requisitionNumber: input.requisitionNumber,
        status: input.status,
        statusConfidence: input.statusConfidence,
        createdAt: input.createdAt,
        createdBy: { connect: { id: ctx.session.user.id } },
        company: {
          connect: { name: input.company.name },
        },
      };

      const existingRole = input.requisitionNumber
        ? await ctx.db.role.findUnique({
            where: { requisitionNumber: input.requisitionNumber },
            select: { id: true, status: true },
          })
        : await ctx.db.role.findFirst({
            where: { companyId: company.id, title: input.title },
            select: { id: true, status: true },
          });

      return contactsWithCompanyId
        ? await ctx.db.role.upsert({
            where: { id: existingRole?.id ?? "" },
            update: {
              ...data,
              contacts: {
                upsert: contactsWithCompanyId?.map((contact) => ({
                  where: { email: contact.email },
                  update: {
                    name: contact.name,
                    title: contact.title,
                  },
                  create: { ...contact },
                })),
              },
            },
            create: {
              ...data,
              contacts: {
                create: { ...contactsWithCompanyId },
              },
            },
          })
        : await ctx.db.role.upsert({
            where: { id: existingRole?.id ?? "" },
            update: {
              status: input.status,
              statusConfidence: input.statusConfidence,
              lastStatus: existingRole!.status,
            },
            create: { ...data },
          });
    }),

  getRoles: protectedProcedure.query(({ ctx }) => {
    return ctx.db.role.findMany({
      orderBy: { createdAt: "desc" },
      where: { createdBy: { id: ctx.session.user.id } },
      include: {
        company: true,
        contacts: true,
      },
    });
  }),
});
