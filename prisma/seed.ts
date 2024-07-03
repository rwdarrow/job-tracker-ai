import { db } from "../src/server/db";

async function main() {
  const company1 = await db.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "NVIDIA",
      url: "nvidia.com",
    },
  });
  const company2 = await db.company.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: "LG",
      url: "lg.com",
    },
  });
  const user = await db.user.upsert({
    where: { email: "john.doe@test.com" },
    update: {},
    create: {
      id: "user-uuid-1",
      email: "john.doe@test.com",
      name: "John Doe",
      roles: {
        create: [
          {
            id: "role-uuid-1",
            title: "Software Engineer",
            status: "APPLIED",
            lastStatus: "APPLIED",
            companyId: company1.id,
          },
          {
            id: "role-uuid-2",
            title: "Software Developer",
            status: "IN_PROGRESS_RECRUITER_CONTACT",
            contacts: {
              create: [
                {
                  id: "contact-uuid-1",
                  email: "jane.smith@lg.com",
                  name: "Jane Smith",
                  companyId: company2.id,
                },
              ],
            },
            lastStatus: "APPLIED",
            companyId: company2.id,
          },
        ],
      },
    },
  });
  console.log({ company1, company2, user });
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
