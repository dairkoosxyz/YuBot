const { MessageEmbed } = require('discord.js');
const { oneLine } = require('common-tags');

module.exports = (client, message) => {
  if (message.channel.type === 'dm' || !message.channel.viewable || message.author.bot) return;

  // Get disabled commands
  let disabledCommands = client.db.settings.selectDisabledCommands.pluck().get(message.guild.id) || [];
  if (typeof(disabledCommands) === 'string') disabledCommands = disabledCommands.split(' ');
  
  // Get points
  const { point_tracking: pointTracking, message_points: messagePoints, command_points: commandPoints } = 
    client.db.settings.selectPoints.get(message.guild.id);

  // Command handler
  const prefix = client.db.settings.selectPrefix.pluck().get(message.guild.id);
  const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*`);

  if (prefixRegex.test(message.content)) {

    const [, match] = message.content.match(prefixRegex);
    const args = message.content.slice(match.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    let command = client.commands.get(cmd) || client.aliases.get(cmd); // If command not found, check aliases
    if (command && !disabledCommands.includes(command.name)) {

      // Check permissions
      const permission = command.checkPermissions(message);
      if (permission) {

        // Update points with commandPoints value
        if (pointTracking)
          client.db.users.updatePoints.run({ points: commandPoints }, message.author.id, message.guild.id);
        message.command = true; // Add flag for messageUpdate event
        return command.run(message, args); // Run command
      }
    } else if ( 
      (message.content === `<@${client.user.id}>` || message.content === `<@!${client.user.id}>`) &&
      message.channel.permissionsFor(message.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS'])
    ) {
      const embed = new MessageEmbed()
        .setTitle('Salut, je suis Yû. Besoin d\'aide ?')
        .setThumbnail('https://data.whicdn.com/images/240162440/original.gif')
        .setDescription(`<:info:759717833260924978> **Vous pouvez voir tout ce que je peux faire en utilisant la commande** \`${prefix}help\`.`)
        .addField('Invite', oneLine`
        <:info:759717833260924978> ** Vous pouvez m'ajouter à votre serveur en cliquant** 
          [ici](https://discord.com/api/oauth2/authorize?client_id=735561873608540281&permissions=8&scope=bot)!
        `)
        .addField('Support', oneLine`
        <:aques:759717451901566977> **Si vous avez des questions, des suggestions ou avez trouvé un bug, veuillez rejoindre le serveur de**
          [Support](https://discord.gg/vUP2tYM)!
        `)
        .setColor('#d1b7ff');
      message.channel.send(embed);
    }
  }

  // Update points with messagePoints value
  if (pointTracking) client.db.users.updatePoints.run({ points: messagePoints }, message.author.id, message.guild.id);
};

