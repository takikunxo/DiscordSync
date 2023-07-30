export type Task = {
  monitor_channel: string;
  destination_channel: string;
  mention: string;
  webhook_url: string;
  webhook_user_name: string;
  webhook_avatar_url: string;
  positive_keywords_type: string;
  positive_keywords: string;
  negative_keywords_type: string;
  negative_keywords: string;
};
