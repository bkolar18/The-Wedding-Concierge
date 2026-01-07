'use client';

import { useState, useEffect } from 'react';
import { getAnalytics, AnalyticsData } from '@/lib/api';

interface AnalyticsDashboardProps {
  token: string;
}

export default function AnalyticsDashboard({ token }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [token]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await getAnalytics(token);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get topic color based on topic name
  const getTopicColor = (topic: string) => {
    const colors: Record<string, string> = {
      'Dress Code': 'bg-pink-100 text-pink-700',
      'Venue & Directions': 'bg-blue-100 text-blue-700',
      'Schedule & Timing': 'bg-orange-100 text-orange-700',
      'Accommodations': 'bg-purple-100 text-purple-700',
      'Food & Drinks': 'bg-yellow-100 text-yellow-700',
      'RSVP & Plus Ones': 'bg-green-100 text-green-700',
      'Registry & Gifts': 'bg-red-100 text-red-700',
      'Transportation': 'bg-cyan-100 text-cyan-700',
      'Photos & Social': 'bg-indigo-100 text-indigo-700',
      'Wedding Party': 'bg-rose-100 text-rose-700',
      'General Info': 'bg-gray-100 text-gray-700',
    };
    return colors[topic] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Sort topics by count for the breakdown
  const sortedTopics = Object.entries(analytics.topic_breakdown || {})
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Conversations</p>
              <p className="text-2xl font-semibold text-gray-800">{analytics.total_sessions}</p>
            </div>
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Messages</p>
              <p className="text-2xl font-semibold text-gray-800">{analytics.total_messages}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Web Chats</p>
              <p className="text-2xl font-semibold text-gray-800">{analytics.web_sessions}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">SMS Chats</p>
              <p className="text-2xl font-semibold text-gray-800">{analytics.sms_sessions}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Chat Engagement */}
      {analytics.total_guests > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-1 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Guest Chat Engagement
              </h3>
              <p className="text-white/80 text-sm">
                Registered guests who have used the concierge chat
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">
                {analytics.guests_who_used_chat}
                <span className="text-2xl font-normal text-white/80"> / {analytics.total_guests}</span>
              </p>
              <p className="text-sm text-white/80 mt-1">
                {analytics.total_guests > 0
                  ? `${Math.round((analytics.guests_who_used_chat / analytics.total_guests) * 100)}% engagement`
                  : '0% engagement'
                }
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all"
              style={{
                width: analytics.total_guests > 0
                  ? `${(analytics.guests_who_used_chat / analytics.total_guests) * 100}%`
                  : '0%'
              }}
            />
          </div>
        </div>
      )}

      {/* Topic Breakdown */}
      {sortedTopics.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            What Guests Are Asking About
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            See the most common topics your guests have questions about
          </p>
          <div className="space-y-3">
            {sortedTopics.map(([topic, count]) => {
              const maxCount = sortedTopics[0]?.[1] || 1;
              const percentage = Math.round((count / maxCount) * 100);
              return (
                <div key={topic} className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getTopicColor(topic)}`}>
                    {topic}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Conversations (with topics, not full transcripts) */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
          Recent Conversations
        </h3>

        {analytics.recent_sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Share your chat link with guests to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {analytics.recent_sessions.map((session) => (
              <div
                key={session.id}
                className="py-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      session.channel === 'sms' ? 'bg-purple-100' : 'bg-green-100'
                    }`}>
                      {session.channel === 'sms' ? (
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {session.guest_name || 'Anonymous Guest'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(session.last_message_at)} · {session.message_count} messages
                      </p>
                    </div>
                  </div>
                </div>
                {/* Topics tags */}
                <div className="flex flex-wrap gap-1.5 ml-11">
                  {(session.topics || []).map((topic) => (
                    <span
                      key={topic}
                      className={`text-xs px-2 py-0.5 rounded-full ${getTopicColor(topic)}`}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
