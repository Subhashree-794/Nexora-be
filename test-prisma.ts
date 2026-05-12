import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Testing notification query...');
  await prisma.notification.findMany();
  
  console.log('Testing meeting query...');
  await prisma.meeting.findMany({
    include: { _count: { select: { notes: true, tasks: true } } }
  });
  
  console.log('Success!');
}

main()
  .catch(e => console.error('ERROR:', e.message))
  .finally(() => prisma.$disconnect());
