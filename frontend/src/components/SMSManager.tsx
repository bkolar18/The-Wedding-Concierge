'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Guest,
  GuestCreateData,
  SMSTemplate,
  ScheduledMessage,
  getGuests,
  createGuest,
  uploadGuests,
  deleteGuest,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendSMSBlast,
  scheduleMessage,
  getScheduledMessages,
  cancelScheduledMessage,
} from '@/lib/api';

interface SMSManagerProps {
  token: string;
  weddingId: string;
}

type ModalType = 'addGuest' | 'uploadGuests' | 'sendBlast' | 'scheduleMessage' | 'editTemplate' | null;

export default function SMSManager({ token, weddingId }: SMSManagerProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [guestForm, setGuestForm] = useState<GuestCreateData>({ name: '', phone_number: '' });
  const [blastMessage, setBlastMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    message: '',
    scheduleType: 'fixed' as 'fixed' | 'relative',
    scheduledAt: '',
    relativeTo: 'wedding_date' as 'wedding_date' | 'rsvp_deadline',
    relativeDays: -7,
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    id: null as string | null,
    name: '',
    content: '',
    category: 'custom' as string,
  });

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [guestsData, templatesData, scheduledData] = await Promise.all([
          getGuests(token, weddingId),
          getTemplates(token, weddingId),
          getScheduledMessages(token, weddingId),
        ]);
        setGuests(guestsData);
        setTemplates(templatesData);
        setScheduledMessages(scheduledData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [token, weddingId]);

  const reloadData = async () => {
    try {
      const [guestsData, templatesData, scheduledData] = await Promise.all([
        getGuests(token, weddingId),
        getTemplates(token, weddingId),
        getScheduledMessages(token, weddingId),
      ]);
      setGuests(guestsData);
      setTemplates(templatesData);
      setScheduledMessages(scheduledData);
    } catch {
      // Ignore
    }
  };

  const closeModal = () => {
    setModalType(null);
    setModalError(null);
    setGuestForm({ name: '', phone_number: '' });
    setBlastMessage('');
    setSelectedTemplate('');
    setScheduleForm({
      name: '',
      message: '',
      scheduleType: 'fixed',
      scheduledAt: '',
      relativeTo: 'wedding_date',
      relativeDays: -7,
    });
    setTemplateForm({ id: null, name: '', content: '', category: 'custom' });
  };

  // Guest handlers
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError(null);
    try {
      await createGuest(token, weddingId, guestForm);
      await reloadData();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to add guest');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadGuests = async (file: File) => {
    setIsSaving(true);
    setModalError(null);
    try {
      const result = await uploadGuests(token, weddingId, file);
      await reloadData();
      alert(`Added ${result.added} guests, skipped ${result.skipped}`);
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to upload guests');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Are you sure you want to remove this guest?')) return;
    try {
      await deleteGuest(token, weddingId, guestId);
      await reloadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete guest');
    }
  };

  // SMS handlers
  const handleSendBlast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blastMessage.trim()) return;

    const eligibleGuests = guests.filter(g => g.sms_consent && !g.opted_out);
    if (eligibleGuests.length === 0) {
      setModalError('No eligible guests to send to');
      return;
    }

    if (!confirm(`Send SMS to ${eligibleGuests.length} guests?`)) return;

    setIsSaving(true);
    setModalError(null);
    try {
      const result = await sendSMSBlast(token, weddingId, { message: blastMessage });
      await reloadData();
      alert(`Sent to ${result.sent} guests, ${result.failed} failed`);
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setIsSaving(false);
    }
  };

  // Schedule message handler
  const handleScheduleMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.name.trim() || !scheduleForm.message.trim()) return;

    setIsSaving(true);
    setModalError(null);
    try {
      await scheduleMessage(token, weddingId, {
        name: scheduleForm.name,
        message: scheduleForm.message,
        schedule_type: scheduleForm.scheduleType,
        scheduled_at: scheduleForm.scheduleType === 'fixed' ? scheduleForm.scheduledAt : undefined,
        relative_to: scheduleForm.scheduleType === 'relative' ? scheduleForm.relativeTo : undefined,
        relative_days: scheduleForm.scheduleType === 'relative' ? scheduleForm.relativeDays : undefined,
      });
      await reloadData();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to schedule message');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelScheduled = async (messageId: string) => {
    if (!confirm('Cancel this scheduled message?')) return;
    try {
      await cancelScheduledMessage(token, weddingId, messageId);
      await reloadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  // Template handlers
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.content.trim()) return;

    setIsSaving(true);
    setModalError(null);
    try {
      if (templateForm.id) {
        await updateTemplate(token, weddingId, templateForm.id, {
          name: templateForm.name,
          content: templateForm.content,
          category: templateForm.category,
        });
      } else {
        await createTemplate(token, weddingId, {
          name: templateForm.name,
          content: templateForm.content,
          category: templateForm.category,
        });
      }
      await reloadData();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(token, weddingId, templateId);
      await reloadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const openEditTemplate = (template?: SMSTemplate) => {
    if (template) {
      setTemplateForm({
        id: template.id,
        name: template.name,
        content: template.content,
        category: template.category || 'custom',
      });
    } else {
      setTemplateForm({ id: null, name: '', content: '', category: 'custom' });
    }
    setModalType('editTemplate');
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const eligibleCount = guests.filter(g => g.sms_consent && !g.opted_out).length;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>
      )}

      {/* Guests Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Guests ({guests.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setModalType('uploadGuests')}
              className="text-sm text-gray-600 hover:text-rose-600 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
            <button
              onClick={() => setModalType('addGuest')}
              className="text-sm text-rose-600 hover:text-rose-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {guests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No guests yet. Add guests to start sending SMS.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left py-2 font-medium text-gray-600">Phone</th>
                  <th className="text-left py-2 font-medium text-gray-600">Group</th>
                  <th className="text-left py-2 font-medium text-gray-600">Status</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {guests.slice(0, 10).map((guest) => (
                  <tr key={guest.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2">{guest.name}</td>
                    <td className="py-2 text-gray-600">{formatPhone(guest.phone_number)}</td>
                    <td className="py-2 text-gray-500">{guest.group_name || '-'}</td>
                    <td className="py-2">
                      {guest.opted_out ? (
                        <span className="text-red-600 text-xs">Opted out</span>
                      ) : guest.sms_consent ? (
                        <span className="text-green-600 text-xs">Active</span>
                      ) : (
                        <span className="text-gray-400 text-xs">No consent</span>
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDeleteGuest(guest.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {guests.length > 10 && (
              <p className="text-gray-500 text-sm mt-2">...and {guests.length - 10} more</p>
            )}
          </div>
        )}
      </div>

      {/* SMS Campaigns Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            SMS Campaigns
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setModalType('scheduleMessage')}
              disabled={eligibleCount === 0}
              className="text-sm text-gray-600 hover:text-rose-600 flex items-center disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Schedule
            </button>
            <button
              onClick={() => setModalType('sendBlast')}
              disabled={eligibleCount === 0}
              className="text-sm bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Now
            </button>
          </div>
        </div>

        <p className="text-gray-500 text-sm mb-4">
          {eligibleCount} of {guests.length} guests can receive SMS
        </p>

        {scheduledMessages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No campaigns yet</p>
        ) : (
          <div className="space-y-3">
            {scheduledMessages.slice(0, 5).map((msg) => (
              <div key={msg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{msg.name}</p>
                  <p className="text-sm text-gray-500">
                    {msg.status === 'sent' || msg.status === 'partially_sent' ? (
                      <>Sent: {msg.sent_count}/{msg.total_recipients}</>
                    ) : msg.status === 'scheduled' ? (
                      msg.schedule_type === 'relative' && msg.relative_days != null ? (
                        <>{Math.abs(msg.relative_days)} days {msg.relative_days < 0 ? 'before' : 'after'} {msg.relative_to?.replace('_', ' ')}</>
                      ) : (
                        <>Scheduled for {new Date(msg.scheduled_at!).toLocaleDateString()}</>
                      )
                    ) : (
                      msg.status
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    msg.status === 'sent' ? 'bg-green-100 text-green-700' :
                    msg.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    msg.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {msg.status}
                  </span>
                  {msg.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancelScheduled(msg.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            SMS Templates ({templates.length})
          </h2>
          <button
            onClick={() => openEditTemplate()}
            className="text-sm text-rose-600 hover:text-rose-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Placeholders like {"{{guest_name}}"} are automatically replaced with real info when sent.
        </p>
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800">{template.name}</p>
                <p className="text-sm text-gray-500 truncate">{template.content}</p>
              </div>
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => openEditTemplate(template)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-gray-500 text-center py-4">No templates yet</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Add Guest Modal */}
            {modalType === 'addGuest' && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Add Guest</h3>
                <form onSubmit={handleAddGuest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={guestForm.name}
                      onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={guestForm.phone_number}
                      onChange={(e) => setGuestForm({ ...guestForm, phone_number: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group (optional)</label>
                    <input
                      type="text"
                      value={guestForm.group_name || ''}
                      onChange={(e) => setGuestForm({ ...guestForm, group_name: e.target.value })}
                      placeholder="e.g., Bride's Family"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
                      {isSaving ? 'Adding...' : 'Add Guest'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Upload Guests Modal */}
            {modalType === 'uploadGuests' && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Upload Guest List</h3>
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Upload a CSV or Excel file with columns: <code className="bg-gray-100 px-1">name</code>, <code className="bg-gray-100 px-1">phone</code>, and optionally <code className="bg-gray-100 px-1">group</code>, <code className="bg-gray-100 px-1">email</code>.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadGuests(file);
                    }}
                    className="w-full"
                  />
                  {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
                  {isSaving && <p className="text-gray-600">Uploading...</p>}
                  <button type="button" onClick={closeModal} className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Send Blast Modal */}
            {modalType === 'sendBlast' && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Send SMS Blast</h3>
                <form onSubmit={handleSendBlast} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Use Template</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        const template = templates.find(t => t.id === e.target.value);
                        if (template) setBlastMessage(template.content);
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">Custom message</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <textarea
                      value={blastMessage}
                      onChange={(e) => setBlastMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      placeholder="Hi {{guest_name}}! ..."
                      required
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      {blastMessage.length}/160 characters. Variables: {'{{guest_name}}'}, {'{{partner1}}'}, {'{{partner2}}'}, {'{{chat_link}}'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Will send to <strong>{eligibleCount}</strong> guests
                  </p>
                  {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving || !blastMessage.trim()} className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
                      {isSaving ? 'Sending...' : 'Send Now'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Schedule Message Modal */}
            {modalType === 'scheduleMessage' && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Schedule Message</h3>
                <form onSubmit={handleScheduleMessage} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                    <input
                      type="text"
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                      placeholder="e.g., RSVP Reminder"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Use Template</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        const template = templates.find(t => t.id === e.target.value);
                        if (template) setScheduleForm({ ...scheduleForm, message: template.content });
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">Custom message</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <textarea
                      value={scheduleForm.message}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, message: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      placeholder="Hi {{guest_name}}! ..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="scheduleType"
                          checked={scheduleForm.scheduleType === 'fixed'}
                          onChange={() => setScheduleForm({ ...scheduleForm, scheduleType: 'fixed' })}
                          className="mr-2 text-rose-600"
                        />
                        Specific Date
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="scheduleType"
                          checked={scheduleForm.scheduleType === 'relative'}
                          onChange={() => setScheduleForm({ ...scheduleForm, scheduleType: 'relative' })}
                          className="mr-2 text-rose-600"
                        />
                        Relative to Event
                      </label>
                    </div>
                  </div>
                  {scheduleForm.scheduleType === 'fixed' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Send Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={scheduleForm.scheduledAt}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relative To</label>
                        <select
                          value={scheduleForm.relativeTo}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, relativeTo: e.target.value as 'wedding_date' | 'rsvp_deadline' })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        >
                          <option value="wedding_date">Wedding Date</option>
                          <option value="rsvp_deadline">RSVP Deadline</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Days Before/After</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={Math.abs(scheduleForm.relativeDays)}
                            onChange={(e) => {
                              const days = parseInt(e.target.value) || 0;
                              setScheduleForm({ ...scheduleForm, relativeDays: scheduleForm.relativeDays < 0 ? -days : days });
                            }}
                            className="w-20 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                            min="0"
                          />
                          <span className="text-gray-600">days</span>
                          <select
                            value={scheduleForm.relativeDays < 0 ? 'before' : 'after'}
                            onChange={(e) => {
                              const days = Math.abs(scheduleForm.relativeDays);
                              setScheduleForm({ ...scheduleForm, relativeDays: e.target.value === 'before' ? -days : days });
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg"
                          >
                            <option value="before">before</option>
                            <option value="after">after</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
                      {isSaving ? 'Scheduling...' : 'Schedule'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Edit Template Modal */}
            {modalType === 'editTemplate' && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {templateForm.id ? 'Edit Template' : 'Add Template'}
                </h3>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="e.g., Welcome Message"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="welcome">Welcome</option>
                      <option value="reminder">Reminder</option>
                      <option value="update">Update</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message Content *</label>
                    <textarea
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      placeholder="Hi {{guest_name}}! {{partner1}} & {{partner2}} are getting married..."
                      required
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Available variables: {'{{guest_name}}'}, {'{{partner1}}'}, {'{{partner2}}'}, {'{{wedding_date}}'}, {'{{chat_link}}'}, {'{{venue}}'}
                    </p>
                  </div>
                  {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
                      {isSaving ? 'Saving...' : templateForm.id ? 'Save Changes' : 'Add Template'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
