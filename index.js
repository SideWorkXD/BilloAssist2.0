const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Define an array of custom status messages
const statusMessages = [
  'Helping BilloXD',
  'Watching Members',
  'Editing Reels!',
  'dsc/gg/billoxd'
];

// Create an Express server
const app = express();
const port = process.env.PORT || 3000; // Use the port provided by Render or default to 3000

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Object to store voice connections for multiple servers
let connections = {};

// Function to join a voice channel in a given guild
const reconnectVoiceChannel = async (guildId, voiceChannelId, userId) => {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return console.error(`Guild with ID ${guildId} not found`);

    const voiceChannel = guild.channels.cache.get(voiceChannelId);
    if (!voiceChannel) return console.error(`Voice channel with ID ${voiceChannelId} not found`);

    // If a connection already exists, destroy it first
    if (connections[guildId]) {
      console.log(`Disconnecting previous connection in guild ${guildId}`);
      connections[guildId].destroy();
    }

    // Create a new connection for the guild
    connections[guildId] = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    // Listen for the connection's status
    connections[guildId].on(VoiceConnectionStatus.Ready, () => {
      console.log(`Bot has reconnected to the voice channel in guild ${guildId}`);
    });

    connections[guildId].on(VoiceConnectionStatus.Disconnected, async () => {
      console.log(`Bot has been disconnected from the voice channel in guild ${guildId}`);
      // Reattempt reconnection
      await reconnectVoiceChannel(guildId, voiceChannelId, userId);
      
      // Get the user to DM
      const user = await client.users.fetch(userId);
      if (user) {
        user.send(`The bot has disconnected from the voice channel in guild ${guildId}.`).catch(console.error);
      } else {
        console.error('User not found');
      }
    });

  } catch (error) {
    console.error(`Error reconnecting to voice channel in guild ${guildId}:`, error);
  }
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Function to set the custom status
  const setCustomStatus = (status) => {
    client.user.setPresence({
      activities: [{ name: status, type: 0 }],
      status: 'online'
    });
  };

  // Set an initial status
  setCustomStatus(statusMessages[0]);

  // Change status every 30 seconds (30000 milliseconds)
  let index = 0;
  setInterval(() => {
    index = (index + 1) % statusMessages.length;
    setCustomStatus(statusMessages[index]);
  }, 30000);

  // Attempt to connect to the voice channels in two different servers
  reconnectVoiceChannel(process.env.GUILD_ID_1, process.env.VOICE_CHANNEL_ID_1, process.env.USER_ID);
  reconnectVoiceChannel(process.env.GUILD_ID_2, process.env.VOICE_CHANNEL_ID_2, process.env.USER_ID);
});

client.login(process.env.TOKEN);
