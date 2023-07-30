import { Message } from 'discord.js-selfbot-v13';
import { WebhookClient } from 'discord.js';
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
  if (!message.content) {
    return [];
  }

  return tasks.filter((element) => {
    if (element.monitor_channel !== message.channelId) {
      return false;
    }

    // ポジティブキーワードによる検索
    const positiveKeywords = element.positive_keywords?.split(',');
    if (
      positiveKeywords &&
      positiveKeywords.length !== 0 &&
      positiveKeywords[0]
    ) {
      if (
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
    const negativeKeywords = element.negative_keywords?.split(',');
    if (
      negativeKeywords &&
      negativeKeywords.length !== 0 &&
      negativeKeywords[0]
    ) {
      if (
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

function sendWebhook(hitChannels: Task[], message: Message<boolean>) {
  hitChannels.forEach((element) => {
    const webhookClient = new WebhookClient({
      url: element.webhook_url,
    });

    let { content } = message;
    content = `${content}\r\n\r\n**forwarded from** ${message.url}`;
    if (element.mention) {
      content = `${content} **to** ${element.mention}`;
    }
    webhookClient
      .send({
        content,
        username: element.webhook_user_name,
        avatarURL: element.webhook_avatar_url,
        embeds: message.embeds,
      })
      // TODO：エラー処理
      .catch((error) => console.log(error.message));
  });
}

export { getHitChannels, sendWebhook };
