// supervisorbot.js - Save/Bind Telegram Chat ID
bot.command('register', async (ctx) => {
  const chatId = ctx.chat.id;
  const telegramHandle = ctx.from.username;

  // Store or link chatId with system admin/user
  // e.g., await User.findOneAndUpdate({ telegramHandle }, { telegramChatId: chatId });

  ctx.reply(`Registered! Your Chat ID (${chatId}) is now linked to receive system notifications.`);
});