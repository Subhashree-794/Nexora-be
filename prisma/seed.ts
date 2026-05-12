import { PrismaClient, ClubRole, TaskStatus, Priority, MeetingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', passwordHash, name: 'Alice Johnson', bio: 'Club founder & full-stack dev' },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', passwordHash, name: 'Bob Smith' },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: { email: 'carol@example.com', passwordHash, name: 'Carol White' },
  });

  const club = await prisma.club.create({
    data: {
      name: 'Tech Club',
      description: 'A club for tech enthusiasts — building, learning, and shipping together.',
      members: {
        create: [
          { userId: alice.id, role: ClubRole.OWNER },
          { userId: bob.id, role: ClubRole.CORE_MEMBER },
          { userId: carol.id, role: ClubRole.MEMBER },
        ],
      },
    },
  });

  const meeting = await prisma.meeting.create({
    data: {
      clubId: club.id,
      title: 'Q2 Kickoff Meeting',
      agenda: '1. Review Q1 progress\n2. Set Q2 goals\n3. Assign tasks',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: MeetingStatus.SCHEDULED,
    },
  });

  await prisma.meetingNote.create({
    data: {
      meetingId: meeting.id,
      authorId: alice.id,
      discussionPoints: '## Discussion\n\n- Reviewed Q1 deliverables\n- Discussed blockers\n- Agreed on new tech stack',
      decisions: '## Decisions\n\n- Adopt TypeScript across all projects\n- Weekly standups every Monday',
      actionItems: '- [ ] Bob: Set up CI/CD pipeline\n- [ ] Carol: Write onboarding docs',
    },
  });

  const task1 = await prisma.task.create({
    data: {
      clubId: club.id,
      meetingId: meeting.id,
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assigneeId: bob.id,
      createdById: alice.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.taskComment.create({
    data: { taskId: task1.id, authorId: bob.id, content: 'Started working on this. Will use GitHub Actions.' },
  });

  await prisma.task.create({
    data: {
      clubId: club.id,
      title: 'Write onboarding documentation',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      assigneeId: carol.id,
      createdById: alice.id,
    },
  });

  await prisma.dailyUpdate.create({
    data: {
      clubId: club.id,
      authorId: bob.id,
      content: '## Today\'s Progress\n\nWorked on the **CI/CD pipeline** setup. Got the basic GitHub Actions workflow running.\n\nAlso reviewed the new TypeScript config.',
      completedTasks: ['Reviewed TypeScript config', 'Set up basic GitHub Actions workflow'],
      date: new Date(),
    },
  });

  const reactTag = await prisma.tag.create({ data: { name: 'React', color: '#61dafb' } });
  const nodeTag = await prisma.tag.create({ data: { name: 'Node.js', color: '#68a063' } });
  const aiTag = await prisma.tag.create({ data: { name: 'AI/ML', color: '#ff6b6b' } });

  await prisma.note.create({
    data: {
      clubId: club.id,
      authorId: alice.id,
      title: 'React Best Practices',
      content: '# React Best Practices\n\n## Component Design\n\n- Keep components small and focused\n- Use custom hooks for logic reuse\n- Prefer composition over inheritance\n\n## Performance\n\n- Use `React.memo` for expensive renders\n- Lazy load routes with `React.lazy`\n- Avoid inline object/function creation in JSX',
      isPinned: true,
      tags: { create: [{ tagId: reactTag.id }] },
    },
  });

  await prisma.note.create({
    data: {
      clubId: club.id,
      authorId: bob.id,
      title: 'Node.js API Patterns',
      content: '# Node.js API Patterns\n\n## Error Handling\n\nAlways use try/catch in async route handlers.\n\n```js\napp.get("/users", async (req, res) => {\n  try {\n    const users = await db.users.findAll();\n    res.json(users);\n  } catch (err) {\n    res.status(500).json({ error: err.message });\n  }\n});\n```',
      tags: { create: [{ tagId: nodeTag.id }] },
    },
  });

  await prisma.activityLog.createMany({
    data: [
      { clubId: club.id, userId: alice.id, action: 'created_meeting', entity: 'Meeting', entityId: meeting.id, meta: { title: meeting.title } },
      { clubId: club.id, userId: bob.id, action: 'posted_daily_update', entity: 'DailyUpdate', entityId: 'seed', meta: {} },
    ],
  });

  console.log('✅ Seed complete');
  console.log('   alice@example.com / password123 (OWNER)');
  console.log('   bob@example.com / password123 (CORE_MEMBER)');
  console.log('   carol@example.com / password123 (MEMBER)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
