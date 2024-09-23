const fetch = require("node-fetch");

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

const pingRegex = /<@(\d+)>/g;
function messageContentFilter(msg, client){
  let msgcontent = msg.content

  //replace ping with name
  if (msg.mentions.users.size > 0) {
    let mentionuser;
    msg.mentions.users.forEach((mentionedMember) => {
      mentionuser = mentionedMember;
    });
    msgcontent = msgcontent.replace(pingRegex, `@${getAutherName(mentionuser)}`);
  }

  if (msg.mentions.repliedUser && client.user.id != msg.mentions.repliedUser.id && client.user.id != msg.author.id) {
    msgcontent = "@" + getAutherName(msg.mentions.repliedUser) + " " + msgcontent
  }

  return msgcontent
}

const orouterKey = process.env.orouter;
const orouterPrompt = process.env.orouterPrompt;
const orouterAskPrompt = process.env.orouterAskPrompt;

//console.log(orouterPrompt,"ghi")

async function main(found_channel, client, question) {
  if (question) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "nousresearch/hermes-3-llama-3.1-405b:free",
        "messages": [
          {
            role: "system",
            content: orouterAskPrompt
          },
          {
            role: "user",
            content: question
          }
        ],
        "temperature": 0,
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    console.log("reading buffer.....")
    const obj = await response.json(); // await for the buffer to complete then tojson
    const choice = obj.choices[0].message.content;
    console.log(choice)
    
    return choice
  }
  let prevmessages = await found_channel.messages.fetch({ limit: 14 });
  let history = [
    {
      role: "system",
      content: orouterPrompt
    }
  ]
  prevmessages.forEach((msg) => {
    let msgv = messageContentFilter(msg, client).substring(0, 256).replace(/ {2,}/g, ' ') // remove double or more spaces
    if (msg.author.id == client.user.id) {
      history.push({
        role: "system",
        content: msgv
      });
    } else {
      const userName = getAutherName(msg.author);
      history.push({
        role: "user",
        content: userName + ": " + msgv
      });
    }
  })
  
  //console.log(history)
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${orouterKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "nousresearch/hermes-3-llama-3.1-405b:free",
      "messages": history,
      "temperature": 0,
    })
  })
  
  if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  
      
  console.log("reading buffer.....")
  const obj = await response.json(); // await for the buffer to complete then tojson
  const choice = obj.choices[0].message.content;
  console.log(choice)
  
  return choice
}

module.exports = main;
