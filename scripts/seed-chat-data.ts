/**
 * Seed Script for Chat Module Testing
 * Populates database with realistic test data:
 * - 20+ Direct Chats (1-on-1)
 * - 10+ Group Chats
 * - 50+ Messages with various content types
 * - Proper read status and timestamps
 */

import dataSource from '../src/database/data-source';
import { Chat, ChatType } from '../src/entities/chat.entity';
import { Message, MessageType } from '../src/entities/message.entity';
import { User } from '../src/entities/user.entity';

const messageTemplates = {
  text: [
    'Xin chào, bạn khỏe không?',
    'Có tin gì mới không?',
    'Tôi vừa hoàn thành project mới',
    'Hôm nay bận không?',
    'Có thể họp vào lúc 3h chiều được không?',
    'File đã gửi rồi, bạn kiểm tra xem',
    'Cảm ơn bạn đã giúp đỡ!',
    'Rất tốt, cảm ơn feedback',
    'Vậy cùng làm việc thôi',
    'Bạn có thể giúp tôi không?',
    'Tôi đồng ý với ý kiến của bạn',
    'Hãy gửi cho tôi chi tiết nhé',
    'OK, tôi sẽ làm ngay',
    'Cảm ơn rất nhiều!',
    'Có gì cần hỗ trợ không?',
    'Bạn nghĩ thế nào về idea này?',
    'Chúng ta nên họp sớm',
    'Thời gian tốt nhất là khi nào?',
    'Tôi có một số câu hỏi',
    'Bạn có rảnh không?',
    'Chúng tôi cần bàn về deadline',
    'Dự án đang tiến hành tốt',
    'Tôi sẽ update bạn sau',
    'Có bao nhiêu user cần support?',
    'Phần backend đã xong 80%',
    'Frontend còn chờ API endpoints',
    'Code review xong rồi',
    'Merge vào main được không?',
    'CI/CD test đang chạy',
    'Deploy lên staging thành công',
  ],
};

async function seedChatData() {
  try {
    console.log('🌱 Starting database seed for Chat Module...\n');

    // Initialize database
    await dataSource.initialize();
    console.log('🔗 Database connected\n');

    const chatRepository = dataSource.getRepository(Chat);
    const messageRepository = dataSource.getRepository(Message);
    const usersRepository = dataSource.getRepository(User);

    // Get all users
    const users = await usersRepository.find();
    console.log(`👥 Found ${users.length} users`);

    if (users.length < 3) {
      console.log('❌ Need at least 3 users to seed chat data');
      return;
    }

    // Clear existing chat data
    console.log('\n🗑️  Clearing existing chat data...');
    // First clear messages, then chats
    const allMessages = await messageRepository.find();
    if (allMessages.length > 0) {
      await messageRepository.remove(allMessages);
    }
    const allChats = await chatRepository.find();
    if (allChats.length > 0) {
      await chatRepository.remove(allChats);
    }
    console.log('✓ Cleared');

    let chatCount = 0;
    let messageCount = 0;

    // ==================== DIRECT CHATS ====================
    console.log('\n📝 Creating 20+ Direct Chats...');
    
    for (let i = 0; i < users.length - 1; i++) {
      for (let j = i + 1; j < users.length; j++) {
        if (chatCount >= 20) break;

        const user1 = users[i];
        const user2 = users[j];

        const directChat = await chatRepository.save({
          name: '',
          type: ChatType.DIRECT,
          members: [user1, user2],
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        } as any);

        // Add 3-10 messages to each direct chat
        const messageCount_ = Math.floor(Math.random() * 8) + 3;
        for (let m = 0; m < messageCount_; m++) {
          const sender = Math.random() > 0.5 ? user1 : user2;
          const reader = sender.id === user1.id ? user2 : user1;

          const message = await messageRepository.save({
            chat: directChat,
            content: messageTemplates.text[Math.floor(Math.random() * messageTemplates.text.length)],
            type: MessageType.TEXT,
            sender: sender,
            readBy: [sender, ...(Math.random() > 0.3 ? [reader] : [])],
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          } as any);

          messageCount++;
        }

        chatCount++;
        console.log(`  ✓ Direct Chat ${chatCount}: ${user1.email} ↔ ${user2.email} (${messageCount_} messages)`);

        if (chatCount >= 20) break;
      }
      if (chatCount >= 20) break;
    }

    // ==================== GROUP CHATS ====================
    console.log('\n📝 Creating 10+ Group Chats...');
    
    const groupNames = [
      'Frontend Team',
      'Backend Team',
      'DevOps Team',
      'QA Team',
      'Product Managers',
      'Design Team',
      'Marketing Team',
      'HR Department',
      'Executive Board',
      'Tech Discussion',
      'Project X Team',
      'Client Support',
    ];

    for (let i = 0; i < Math.min(10, groupNames.length); i++) {
      // Select random members (3-6 people)
      const memberCount = Math.floor(Math.random() * 4) + 3;
      const selectedMembers: User[] = [];
      const usedIndices = new Set<number>();

      while (selectedMembers.length < memberCount) {
        const randomIndex = Math.floor(Math.random() * users.length);
        if (!usedIndices.has(randomIndex)) {
          selectedMembers.push(users[randomIndex]);
          usedIndices.add(randomIndex);
        }
      }

      const groupChat = await chatRepository.save({
        name: groupNames[i],
        type: ChatType.GROUP,
        members: selectedMembers,
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      } as any);

      // Add 8-20 messages to each group chat
      const groupMessageCount = Math.floor(Math.random() * 13) + 8;
      for (let m = 0; m < groupMessageCount; m++) {
        const sender = selectedMembers[Math.floor(Math.random() * selectedMembers.length)];
        const readByCount = Math.floor(Math.random() * selectedMembers.length);
        const readBy = selectedMembers
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.max(1, readByCount));

        const message = await messageRepository.save({
          chat: groupChat,
          content: messageTemplates.text[Math.floor(Math.random() * messageTemplates.text.length)],
          type: MessageType.TEXT,
          sender: sender,
          readBy: readBy,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        } as any);

        messageCount++;
      }

      console.log(`  ✓ Group Chat ${i + 1}: "${groupChat.name}" (${selectedMembers.length} members, ${groupMessageCount} messages)`);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log(`   📊 Total Direct Chats: ${Math.min(20, chatCount)}`);
    console.log(`   📊 Total Group Chats: ${Math.min(10, groupNames.length)}`);
    console.log(`   📊 Total Messages: ${messageCount}`);
    console.log(`   📊 Total Chats: ${chatCount + Math.min(10, groupNames.length)}`);

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

// Run seed
seedChatData();
