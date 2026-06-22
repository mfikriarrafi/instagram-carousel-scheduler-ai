export interface ScheduledPost {
  id: string;
  created_at: string;
  scheduled_at: string;
  caption: string;
  image_urls: string[];
  status: 'scheduled' | 'posted' | 'failed';
  instagram_post_id?: string;
  error_message?: string;
  frequency: 'once' | 'daily' | 'weekly';
}

export interface AppConfig {
  key: string;
  value: string;
  updated_at: string;
}

export interface DashboardStats {
  totalScheduled: number;
  totalPosted: number;
  totalFailed: number;
  upcomingScheduled: ScheduledPost[];
  recentActivity: ScheduledPost[];
}
