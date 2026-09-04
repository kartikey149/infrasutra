const { bot } = require('../supervisorbot'); // Import initialized telegraf/bot instance

/**
 * Send a message to a specific Telegram Chat ID
 */
const sendTelegramAlert = async (chatId, message) => {
  try {
    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    return { success: true };
  } catch (error) {
    console.error('Failed to send Telegram alert:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendTelegramAlert };