import { Message } from 'discord.js-selfbot-v13';
import { AttachmentBuilder, WebhookClient } from 'discord.js';
import { Task } from './type';

function judgeKeyword(
  content: string,
  keywords: string[],
  keywordType: string
): boolean {
  let isHitKeyword = false;
  let isNotHitKeyword = false;
  keywords.forEach((keyword) => {
    switch (keywordType) {
      case `all`:
        if (!content.toUpperCase().includes(keyword.toUpperCase())) {
          isNotHitKeyword = true;
          return;
        }

        if (keyword === keywords[keywords.length - 1] && !isNotHitKeyword) {
          isHitKeyword = true;
        }
        break;

      case `or`:
        if (content.toUpperCase().includes(keyword.toUpperCase())) {
          isHitKeyword = true;
        }
        break;

      default:
        throw new Error('invalid keywords_type');
    }
  });

  return isHitKeyword;
}

function getHitChannels(tasks: Task[], message: Message<boolean>): Task[] {
  return tasks.filter((element) => {
    if (element.monitor_channel !== message.channelId) {
      return false;
    }

    // ポジティブキーワードによる検索
    const positiveKeywords = element.positive_keywords?.split('+');
    if (
      positiveKeywords &&
      positiveKeywords.length !== 0 &&
      positiveKeywords[0]
    ) {
      if (
        !message.content ||
        !judgeKeyword(
          message.content,
          positiveKeywords,
          element.positive_keywords_type
        )
      ) {
        return false;
      }
    }

    // ネガティブキーワードによる検索
    const negativeKeywords = element.negative_keywords?.split('+');
    if (
      negativeKeywords &&
      negativeKeywords.length !== 0 &&
      negativeKeywords[0]
    ) {
      if (
        !message.content ||
        judgeKeyword(
          message.content,
          negativeKeywords,
          element.negative_keywords_type
        )
      ) {
        return false;
      }
    }

    return true;
  });
}

function sendWebhook(hitChannels: Task[], message: Message<boolean>): string[] {
  const errorMessages: string[] = [];
  hitChannels.forEach((element) => {
    const webhookClient = new WebhookClient({
      url: element.webhook_url,
    });

    let { content } = message;
    if (element.webhook_mention) {
      content = `${element.webhook_mention}\r\n${content}`;
    }
    if (element.webhook_reference_enabled === 'true') {
      content = `${content}\r\n\r\n(${message.url})`;
    }

    const attachments: AttachmentBuilder[] = [];
    message.attachments.forEach((attachment) => {
      const atc = new AttachmentBuilder(attachment.attachment);
      if (attachment.name) {
        atc.setName(attachment.name);
      }
      attachments.push(atc);
    });

    let username: string;
    if (element.webhook_user_name) {
      username = element.webhook_user_name;
    } else {
      username = message.author.displayName;
    }

    let avatarURL: string;
    if (element.webhook_avatar_url) {
      avatarURL = element.webhook_avatar_url;
    } else if (message.author.avatarURL()) {
      // @ts-ignore
      avatarURL = message.author.avatarURL();
    } else {
      avatarURL = '';
    }

    if (avatarURL === '') {
      webhookClient
        .send({
          content,
          username,
          // avatarURL,
          embeds: message.embeds,
          files: attachments,
        })
        .catch((error) => {
          errorMessages.push(error.message);
        });
    } else {
      webhookClient
        .send({
          content,
          username,
          avatarURL,
          embeds: message.embeds,
          files: attachments,
        })
        .catch((error) => {
          errorMessages.push(error.message);
        });
    }
  });

  return errorMessages;
}

export { getHitChannels, sendWebhook };
