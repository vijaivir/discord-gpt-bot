require('dotenv/config');
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

const bot = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
});

bot.on('ready', () => {
    console.log('Bot is ready');
});

const openai = new OpenAI({
    apiKey: process.env.API_KEY,
});

bot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.mentions.users.has(bot.user.id)) return;

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    const botMention = new RegExp(`<@!?${bot.user.id}>`, 'g');
    message.content = message.content.replace(botMention, '').trim();

    let conversation = [];
    conversation.push({
        role: 'system',
        content: 'Benji is a friendly chatbot.'
    });

    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== bot.user.id) return;
        const username = msg.author.username;

        let contentWithoutMention = msg.content.replace(botMention, '').trim();
        
        if(msg.author.id === bot.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: contentWithoutMention,
            });
            return;
        }

        conversation.push({
            role: 'user',
            name: username,
            content: contentWithoutMention,
        });
    });

    const response = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: conversation,
    }).catch((error) => console.error('OpenAi Error:\n', error));
    
    clearInterval(sendTypingInterval);
    if(!response) { 
        message.reply("I'm busy making money right now, please try again later.");
        return;
    }

    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for(let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);
        await message.reply(chunk);
    }
});

bot.login(process.env.TOKEN);