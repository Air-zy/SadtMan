console.log("starting")

const fs = require('fs');

function toText(value) {
  function circularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return undefined; // ignore circular references
        }
        seen.add(value);
      }
      return value;
    };
  }

  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) {
    return value.toString();
  } else if (Array.isArray(value)) {
    return value.join(', ');
  } else if (typeof value === 'object' && value !== null) {
    if (Buffer.isBuffer(value)) {
      const bufferString = value.toString("utf8");
      return bufferString;
    } else {
      return JSON.stringify(value, circularReplacer(), 2);
    }
  } else {
    return String(value);
  }
}

// mobile presence
const filePath = './node_modules/@discordjs/ws/dist/index.js';
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.log('[Mobile Presence ERROR] reading file:', err);
        return;
    }

    // if the browser is already set to "Discord iOS"
    if (data.includes('browser: "Discord iOS",')) {
        console.log('[Mobile Presence] File already modified. No action needed.');
        return;
    }

    const modifiedData = data.replace(
        'browser: DefaultDeviceProperty,',
        'browser: "Discord iOS",'
    );

    //  modified data back to the file
    fs.writeFile(filePath, modifiedData, 'utf8', (err) => {
        if (err) {
            console.error('[Mobile Presence ERROR] writing file:', err);
            return;
        }
        console.log('[Mobile Presence] File modified successfully.');
    });
});


const Discord_Token = process.env.D_BOT_TOKEN
const animodule = require("./agenModule.js");
const heartpump = require("./heart2.js");
const openRouter = require("./openrouter.js");


const discordjs = require("discord.js");
const { Client, GatewayIntentBits, Partials, MessageEmbed, PermissionsBitField } = discordjs;

const express = require("express");
const http = require("http");
const axios = require("axios");


const app = express();
const PORT = process.env.PORT || 3000;

const expectedAuthKey = process.env.akey

app.all(`/`, (req, res) => {
  res.send("hi");
})
        
app.use(express.json());

function runserver() {
  const server = http.createServer(app);
  //server.keepAliveTimeout = 5000;

  server.listen(PORT, () => {
    console.log(`[SERVER] listening on port ${PORT}`);
  }).on("error", (error) => {
    console.log(`[SERVER ERROR] error starting server `, error);
  });
  
  //console.log(server)
  const addressObj = server.address();
  if (addressObj && addressObj.address && addressObj.family === 'IPv6') {
    console.log(`[SERVER] is running at http://[${addressObj.address}]:${addressObj.port}`);
  } else {
    console.log(`[SERVER] is running at http://localhost:${addressObj.port}`);
  }
}

heartpump()
runserver()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  'partials': [Partials.Channel]
});

client.login(Discord_Token).then(() => {
  console.log(`[DISCORD BOT] successful login`);
  
}).catch(err => {
  console.log(`[DISCORD BOT ERROR] error loging in `, err);
  //process.exit();
});

client.on("ready", async () => {
  console.log(`[DISCORD BOT] connected ${client.user.tag}`);
  
  const registeredCmds = await client.application.commands.fetch();
  const commands = JSON.parse(fs.readFileSync('json_storage/discord_commands.json'));

  for (const cmd of commands) {
    const exists = registeredCmds.some(registeredCmd => registeredCmd.name === cmd.name);
    if (!exists) {
      console.log(`[DISCORD BOT] {registered ${cmd.name}} command`);
      await client.application.commands.create(cmd);
    }
  }

  for (const registeredCmd of registeredCmds.values()) {
    const exists = commands.some(cmd => cmd.name === registeredCmd.name);
    if (!exists) {
      console.log(`[DISCORD BOT] {removed ${registeredCmd.name}} command`);
      await registeredCmd.delete();
    }
  }
  
})

function getAutherName(author) {
  let auther_name = "anon";
  if (author.globalName){
    auther_name = author.globalName
  } else {
    auther_name = author.username
  }
  if (auther_name.length < 1){
    auther_name = "anon"
  }
  return auther_name;
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName, options, user } = interaction;
  const userid = user.id;
  
  console.log(commandName, getAutherName(user))
  try {
    if (commandName == "check") {
      //console.log(interaction)
      await interaction.deferReply({ ephemeral: true });
      const channelId = interaction.channelId;

      //console.log(channelId)
      const found_channel = await client.channels.fetch(channelId);
      if (found_channel) {
        const txtResponse = await openRouter(found_channel, client);
        await interaction.editReply({ content: txtResponse, ephemeral: true });
      } else {
        await interaction.editReply({ content: "```js\n" + `err: channel not found` + "```", ephemeral: true });
      }
    } else if (commandName == "ask") {
      await interaction.deferReply({ ephemeral: true });
      const channelId = interaction.channelId;
      const question = toText(options.get('question').value).substring(0, 1024)
      
      //console.log(channelId)
      const found_channel = await client.channels.fetch(channelId);
      if (found_channel) {
        const txtResponse = await openRouter(found_channel, client, question);
        await interaction.editReply({ content: txtResponse, ephemeral: true });
      } else {
        await interaction.editReply({ content: "```js\n" + `err: channel not found` + "```", ephemeral: true });
      }
    }
  } catch (error) {
    console.log('\n[DISCORD BOT ERROR] interaction error', error);
    try {
      if (error && error.stack && error.message){
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply("```js\n" + `err: ${error.message}` + "```");
        } else {
          await interaction.reply("```js\n" + `err: ${error.message}` + "```");
        }
      } else {
        await interaction.reply("```js\n" + toText(error) + "```")
      }
    } catch (err2) {
      console.log('\n[DISCORD INTER ERROR] ', error)
    }
  } // catch block
  
});
