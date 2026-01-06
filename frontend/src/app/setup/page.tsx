'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  getMyWedding,
  createMyWedding,
  updateMyWedding,
  createEvent,
  createAccommodation,
  createFAQ,
  WeddingData,
} from '@/lib/api';

// Step definitions
const STEPS = [
  { id: 'basics', title: 'Basic Info', icon: 'heart' },
  { id: 'venues', title: 'Venues', icon: 'location' },
  { id: 'events', title: 'Events', icon: 'calendar' },
  { id: 'accommodations', title: 'Hotels', icon: 'building' },
  { id: 'faqs', title: 'FAQs', icon: 'question' },
  { id: 'review', title: 'Review', icon: 'check' },
];

// Event presets
const EVENT_PRESETS = [
  { name: 'Welcome Drinks', defaultTime: '7:00 PM', dressCode: 'Smart Casual' },
  { name: 'Rehearsal Dinner', defaultTime: '6:00 PM', dressCode: 'Semi-Formal' },
  { name: 'Ceremony', defaultTime: '4:00 PM', dressCode: '' },
  { name: 'Cocktail Hour', defaultTime: '5:00 PM', dressCode: '' },
  { name: 'Reception', defaultTime: '6:00 PM', dressCode: '' },
  { name: 'After Party', defaultTime: '10:00 PM', dressCode: 'Come as you are' },
  { name: 'Farewell Brunch', defaultTime: '10:00 AM', dressCode: 'Casual' },
];

// FAQ templates
const FAQ_TEMPLATES = [
  {
    category: 'Logistics',
    questions: [
      { q: 'Is there parking available?', a: '' },
      { q: 'What time should I arrive?', a: '' },
      { q: 'How do I get from the ceremony to the reception?', a: '' },
    ],
  },
  {
    category: 'Dress Code',
    questions: [
      { q: 'What should I wear?', a: '' },
      { q: 'Are heels okay or should I bring flats?', a: '' },
    ],
  },
  {
    category: 'Food & Drinks',
    questions: [
      { q: 'Will there be vegetarian/vegan options?', a: '' },
      { q: 'Is there an open bar?', a: '' },
      { q: 'How do I communicate dietary restrictions?', a: '' },
    ],
  },
  {
    category: 'RSVP & Plus Ones',
    questions: [
      { q: 'Can I bring a plus one?', a: '' },
      { q: 'Are children welcome?', a: '' },
      { q: 'When is the RSVP deadline?', a: '' },
    ],
  },
  {
    category: 'Gifts',
    questions: [
      { q: 'Where are you registered?', a: '' },
      { q: 'Do you prefer cash gifts?', a: '' },
    ],
  },
];

// Types for form data
interface EventFormData {
  id?: string;
  name: string;
  date: string;
  time: string;
  venue_name: string;
  venue_address: string;
  description: string;
  dress_code: string;
}

interface AccommodationFormData {
  id?: string;
  hotel_name: string;
  address: string;
  phone: string;
  website_url: string;
  booking_url: string;
  has_room_block: boolean;
  room_block_name: string;
  room_block_code: string;
  room_block_rate: string;
  room_block_deadline: string;
  distance_to_venue: string;
  notes: string;
}

interface FAQFormData {
  id?: string;
  question: string;
  answer: string;
  category: string;
}

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const isEnhanceMode = searchParams.get('enhance') === 'true';

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingWedding, setExistingWedding] = useState<WeddingData | null>(null);

  // Form state for each step
  const [basics, setBasics] = useState({
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    wedding_time: '',
    dress_code: '',
  });

  const [venues, setVenues] = useState({
    ceremony_venue_name: '',
    ceremony_venue_address: '',
    reception_venue_name: '',
    reception_venue_address: '',
    reception_time: '',
    same_venue: false,
  });

  const [events, setEvents] = useState<EventFormData[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationFormData[]>([]);
  const [faqs, setFaqs] = useState<FAQFormData[]>([]);

  // Load existing wedding data if in enhance mode or user has a wedding
  useEffect(() => {
    async function loadExistingData() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const wedding = await getMyWedding(token);
        setExistingWedding(wedding);

        // Pre-fill form data
        setBasics({
          partner1_name: wedding.partner1_name || '',
          partner2_name: wedding.partner2_name || '',
          wedding_date: wedding.wedding_date || '',
          wedding_time: wedding.wedding_time || '',
          dress_code: wedding.dress_code || '',
        });

        setVenues({
          ceremony_venue_name: wedding.ceremony?.venue_name || '',
          ceremony_venue_address: wedding.ceremony?.address || '',
          reception_venue_name: wedding.reception?.venue_name || '',
          reception_venue_address: wedding.reception?.address || '',
          reception_time: wedding.reception?.time || '',
          same_venue: wedding.ceremony?.venue_name === wedding.reception?.venue_name,
        });

        // Load existing events
        if (wedding.events && wedding.events.length > 0) {
          setEvents(wedding.events.map(e => ({
            id: e.id,
            name: e.name,
            date: e.date || '',
            time: e.time || '',
            venue_name: e.venue_name || '',
            venue_address: e.venue_address || '',
            description: e.description || '',
            dress_code: e.dress_code || '',
          })));
        }

        // Load existing accommodations
        if (wedding.accommodations && wedding.accommodations.length > 0) {
          setAccommodations(wedding.accommodations.map(a => ({
            id: a.id,
            hotel_name: a.hotel_name,
            address: a.address || '',
            phone: a.phone || '',
            website_url: '',
            booking_url: a.booking_url || '',
            has_room_block: a.has_room_block,
            room_block_name: a.room_block_name || '',
            room_block_code: a.room_block_code || '',
            room_block_rate: a.room_block_rate || '',
            room_block_deadline: a.room_block_deadline || '',
            distance_to_venue: a.distance_to_venue || '',
            notes: a.notes || '',
          })));
        }

        // Load existing FAQs
        if (wedding.faqs && wedding.faqs.length > 0) {
          setFaqs(wedding.faqs.map(f => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category || 'General',
          })));
        }
      } catch {
        // No existing wedding, that's fine
      } finally {
        setIsLoading(false);
      }
    }

    loadExistingData();
  }, [token, isEnhanceMode]);

  // Check if user is logged in
  useEffect(() => {
    if (!isLoading && !token) {
      // Redirect to register with return URL
      router.push('/register?redirect=/setup');
    }
  }, [isLoading, token, router]);

  const handleNext = async () => {
    setError(null);

    // Validate current step
    if (currentStep === 0) {
      if (!basics.partner1_name.trim() || !basics.partner2_name.trim()) {
        setError('Please enter both partner names');
        return;
      }
    }

    // Save progress
    if (token) {
      setIsSaving(true);
      try {
        if (!existingWedding) {
          // Create wedding on first save
          const result = await createMyWedding(token, {
            partner1_name: basics.partner1_name,
            partner2_name: basics.partner2_name,
            wedding_date: basics.wedding_date || undefined,
            wedding_time: basics.wedding_time || undefined,
            dress_code: basics.dress_code || undefined,
          });
          // Reload to get full wedding data
          const wedding = await getMyWedding(token);
          setExistingWedding(wedding);
        } else {
          // Update existing wedding
          await updateMyWedding(token, {
            partner1_name: basics.partner1_name,
            partner2_name: basics.partner2_name,
            wedding_date: basics.wedding_date || undefined,
            wedding_time: basics.wedding_time || undefined,
            dress_code: basics.dress_code || undefined,
            ceremony_venue_name: venues.ceremony_venue_name || undefined,
            ceremony_venue_address: venues.ceremony_venue_address || undefined,
            reception_venue_name: venues.same_venue ? venues.ceremony_venue_name : venues.reception_venue_name || undefined,
            reception_venue_address: venues.same_venue ? venues.ceremony_venue_address : venues.reception_venue_address || undefined,
            reception_time: venues.reception_time || undefined,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    // Move to next step
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const addEventFromPreset = (preset: typeof EVENT_PRESETS[0]) => {
    setEvents([...events, {
      name: preset.name,
      date: basics.wedding_date,
      time: preset.defaultTime,
      venue_name: '',
      venue_address: '',
      description: '',
      dress_code: preset.dressCode,
    }]);
  };

  const addBlankEvent = () => {
    setEvents([...events, {
      name: '',
      date: basics.wedding_date,
      time: '',
      venue_name: '',
      venue_address: '',
      description: '',
      dress_code: '',
    }]);
  };

  const updateEvent = (index: number, field: keyof EventFormData, value: string) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const addBlankAccommodation = () => {
    setAccommodations([...accommodations, {
      hotel_name: '',
      address: '',
      phone: '',
      website_url: '',
      booking_url: '',
      has_room_block: false,
      room_block_name: '',
      room_block_code: '',
      room_block_rate: '',
      room_block_deadline: '',
      distance_to_venue: '',
      notes: '',
    }]);
  };

  const updateAccommodation = (index: number, field: keyof AccommodationFormData, value: string | boolean) => {
    const updated = [...accommodations];
    updated[index] = { ...updated[index], [field]: value };
    setAccommodations(updated);
  };

  const removeAccommodation = (index: number) => {
    setAccommodations(accommodations.filter((_, i) => i !== index));
  };

  const addFAQFromTemplate = (question: string, category: string) => {
    // Check if already added
    if (faqs.some(f => f.question === question)) return;
    setFaqs([...faqs, { question, answer: '', category }]);
  };

  const addBlankFAQ = () => {
    setFaqs([...faqs, { question: '', answer: '', category: 'General' }]);
  };

  const updateFAQ = (index: number, field: keyof FAQFormData, value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  const removeFAQ = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (!token || !existingWedding) return;

    setIsSaving(true);
    setError(null);

    try {
      // Save any new events
      for (const event of events) {
        if (!event.id && event.name) {
          await createEvent(token, existingWedding.id, {
            event_name: event.name,
            event_date: event.date || undefined,
            event_time: event.time || undefined,
            venue_name: event.venue_name || undefined,
            venue_address: event.venue_address || undefined,
            description: event.description || undefined,
            dress_code: event.dress_code || undefined,
          });
        }
      }

      // Save any new accommodations
      for (const acc of accommodations) {
        if (!acc.id && acc.hotel_name) {
          await createAccommodation(token, existingWedding.id, {
            hotel_name: acc.hotel_name,
            address: acc.address || undefined,
            phone: acc.phone || undefined,
            website_url: acc.website_url || undefined,
            booking_url: acc.booking_url || undefined,
            has_room_block: acc.has_room_block,
            room_block_name: acc.room_block_name || undefined,
            room_block_code: acc.room_block_code || undefined,
            room_block_rate: acc.room_block_rate || undefined,
            room_block_deadline: acc.room_block_deadline || undefined,
            distance_to_venue: acc.distance_to_venue || undefined,
            notes: acc.notes || undefined,
          });
        }
      }

      // Save any new FAQs
      for (const faq of faqs) {
        if (!faq.id && faq.question && faq.answer) {
          await createFAQ(token, existingWedding.id, {
            question: faq.question,
            answer: faq.answer,
            category: faq.category || undefined,
          });
        }
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate completion percentage
  const completionPercent = Math.round(((currentStep + 1) / STEPS.length) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!token) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <Header />

      <main className="py-8 px-4 flex-grow">
        <div className="max-w-3xl mx-auto">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-serif text-gray-800">
                {isEnhanceMode ? 'Enhance Your Wedding Details' : 'Set Up Your Wedding'}
              </h1>
              <span className="text-sm text-gray-500">{completionPercent}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-rose-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mb-8 overflow-x-auto pb-2">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => existingWedding && setCurrentStep(index)}
                disabled={!existingWedding && index > currentStep}
                className={`flex flex-col items-center min-w-[60px] ${
                  index === currentStep
                    ? 'text-rose-600'
                    : index < currentStep
                    ? 'text-green-600'
                    : 'text-gray-400'
                } ${existingWedding ? 'cursor-pointer hover:text-rose-500' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                  index === currentStep
                    ? 'bg-rose-100 border-2 border-rose-600'
                    : index < currentStep
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}>
                  {index < currentStep ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Step 1: Basic Info */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium text-gray-800 mb-2">Basic Information</h2>
                  <p className="text-gray-600 text-sm">Let&apos;s start with the essentials about your wedding.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partner 1 Name *</label>
                    <input
                      type="text"
                      value={basics.partner1_name}
                      onChange={(e) => setBasics({ ...basics, partner1_name: e.target.value })}
                      placeholder="e.g., Alice Smith"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partner 2 Name *</label>
                    <input
                      type="text"
                      value={basics.partner2_name}
                      onChange={(e) => setBasics({ ...basics, partner2_name: e.target.value })}
                      placeholder="e.g., Bob Jones"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wedding Date</label>
                    <input
                      type="date"
                      value={basics.wedding_date}
                      onChange={(e) => setBasics({ ...basics, wedding_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ceremony Time</label>
                    <input
                      type="text"
                      value={basics.wedding_time}
                      onChange={(e) => setBasics({ ...basics, wedding_time: e.target.value })}
                      placeholder="e.g., 4:00 PM"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dress Code</label>
                  <textarea
                    value={basics.dress_code}
                    onChange={(e) => setBasics({ ...basics, dress_code: e.target.value })}
                    placeholder="e.g., Black Tie Optional. Gentlemen: dark suits or tuxedos. Ladies: formal evening gowns or cocktail dresses."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Be as specific as you&apos;d like - this helps guests know exactly what to wear.</p>
                </div>
              </div>
            )}

            {/* Step 2: Venues */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium text-gray-800 mb-2">Venue Details</h2>
                  <p className="text-gray-600 text-sm">Where will your ceremony and reception take place?</p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-800">Ceremony Venue</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
                    <input
                      type="text"
                      value={venues.ceremony_venue_name}
                      onChange={(e) => setVenues({ ...venues, ceremony_venue_name: e.target.value })}
                      placeholder="e.g., St. Mary's Church"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={venues.ceremony_venue_address}
                      onChange={(e) => setVenues({ ...venues, ceremony_venue_address: e.target.value })}
                      placeholder="e.g., 123 Main Street, City, State 12345"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="same-venue"
                    checked={venues.same_venue}
                    onChange={(e) => setVenues({ ...venues, same_venue: e.target.checked })}
                    className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                  />
                  <label htmlFor="same-venue" className="ml-2 text-sm text-gray-700">
                    Reception is at the same venue
                  </label>
                </div>

                {!venues.same_venue && (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="font-medium text-gray-800">Reception Venue</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
                      <input
                        type="text"
                        value={venues.reception_venue_name}
                        onChange={(e) => setVenues({ ...venues, reception_venue_name: e.target.value })}
                        placeholder="e.g., Grand Ballroom"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={venues.reception_venue_address}
                        onChange={(e) => setVenues({ ...venues, reception_venue_address: e.target.value })}
                        placeholder="e.g., 456 Oak Avenue, City, State 12345"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reception Start Time</label>
                  <input
                    type="text"
                    value={venues.reception_time}
                    onChange={(e) => setVenues({ ...venues, reception_time: e.target.value })}
                    placeholder="e.g., 6:00 PM"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Events */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium text-gray-800 mb-2">Wedding Events</h2>
                  <p className="text-gray-600 text-sm">Add all the events your guests should know about.</p>
                </div>

                {/* Event Presets */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-3">Quick Add Common Events:</p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => addEventFromPreset(preset)}
                        disabled={events.some(e => e.name === preset.name)}
                        className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Event List */}
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          value={event.name}
                          onChange={(e) => updateEvent(index, 'name', e.target.value)}
                          placeholder="Event Name"
                          className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                        />
                        <button
                          onClick={() => removeEvent(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => updateEvent(index, 'date', e.target.value)}
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <input
                          type="text"
                          value={event.time}
                          onChange={(e) => updateEvent(index, 'time', e.target.value)}
                          placeholder="Time"
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <input
                          type="text"
                          value={event.venue_name}
                          onChange={(e) => updateEvent(index, 'venue_name', e.target.value)}
                          placeholder="Venue Name"
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <input
                          type="text"
                          value={event.dress_code}
                          onChange={(e) => updateEvent(index, 'dress_code', e.target.value)}
                          placeholder="Dress Code (optional)"
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                      <textarea
                        value={event.description}
                        onChange={(e) => updateEvent(index, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full mt-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={addBlankEvent}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-rose-300 hover:text-rose-500 transition-colors"
                >
                  + Add Custom Event
                </button>
              </div>
            )}

            {/* Step 4: Accommodations */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium text-gray-800 mb-2">Accommodations</h2>
                  <p className="text-gray-600 text-sm">Add hotels where your guests can stay, including any room blocks you&apos;ve arranged.</p>
                </div>

                {/* Accommodation List */}
                <div className="space-y-4">
                  {accommodations.map((acc, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          value={acc.hotel_name}
                          onChange={(e) => updateAccommodation(index, 'hotel_name', e.target.value)}
                          placeholder="Hotel Name"
                          className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0 flex-1"
                        />
                        <button
                          onClick={() => removeAccommodation(index)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={acc.address}
                          onChange={(e) => updateAccommodation(index, 'address', e.target.value)}
                          placeholder="Address"
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <input
                          type="text"
                          value={acc.phone}
                          onChange={(e) => updateAccommodation(index, 'phone', e.target.value)}
                          placeholder="Phone"
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <input
                          type="url"
                          value={acc.booking_url}
                          onChange={(e) => updateAccommodation(index, 'booking_url', e.target.value)}
                          placeholder="Booking URL"
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <input
                          type="text"
                          value={acc.distance_to_venue}
                          onChange={(e) => updateAccommodation(index, 'distance_to_venue', e.target.value)}
                          placeholder="Distance to venue"
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      <div className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          id={`room-block-${index}`}
                          checked={acc.has_room_block}
                          onChange={(e) => updateAccommodation(index, 'has_room_block', e.target.checked)}
                          className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                        />
                        <label htmlFor={`room-block-${index}`} className="ml-2 text-sm text-gray-700">
                          This hotel has a room block
                        </label>
                      </div>

                      {acc.has_room_block && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                          <input
                            type="text"
                            value={acc.room_block_name}
                            onChange={(e) => updateAccommodation(index, 'room_block_name', e.target.value)}
                            placeholder="Block Name (e.g., Smith-Jones Wedding)"
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                          />
                          <input
                            type="text"
                            value={acc.room_block_code}
                            onChange={(e) => updateAccommodation(index, 'room_block_code', e.target.value)}
                            placeholder="Booking Code"
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                          />
                          <input
                            type="text"
                            value={acc.room_block_rate}
                            onChange={(e) => updateAccommodation(index, 'room_block_rate', e.target.value)}
                            placeholder="Rate (e.g., $150/night)"
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                          />
                          <input
                            type="date"
                            value={acc.room_block_deadline}
                            onChange={(e) => updateAccommodation(index, 'room_block_deadline', e.target.value)}
                            placeholder="Booking Deadline"
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      )}

                      <textarea
                        value={acc.notes}
                        onChange={(e) => updateAccommodation(index, 'notes', e.target.value)}
                        placeholder="Notes for guests (optional)"
                        rows={2}
                        className="w-full mt-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={addBlankAccommodation}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-rose-300 hover:text-rose-500 transition-colors"
                >
                  + Add Hotel
                </button>
              </div>
            )}

            {/* Step 5: FAQs */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium text-gray-800 mb-2">Frequently Asked Questions</h2>
                  <p className="text-gray-600 text-sm">Add answers to questions your guests might ask. The chatbot will use these to help your guests.</p>
                </div>

                {/* FAQ Templates by Category */}
                <div className="space-y-4">
                  {FAQ_TEMPLATES.map((category) => (
                    <div key={category.category} className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-medium text-gray-700 mb-2">{category.category}</p>
                      <div className="flex flex-wrap gap-2">
                        {category.questions.map((q) => (
                          <button
                            key={q.q}
                            onClick={() => addFAQFromTemplate(q.q, category.category)}
                            disabled={faqs.some(f => f.question === q.q)}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                          >
                            + {q.q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* FAQ List */}
                {faqs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-800">Your FAQs ({faqs.length})</h3>
                    {faqs.map((faq, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                            placeholder="Question"
                            className="flex-1 font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                          />
                          <button
                            onClick={() => removeFAQ(index)}
                            className="text-gray-400 hover:text-red-500 ml-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <textarea
                          value={faq.answer}
                          onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                          placeholder="Your answer..."
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                        <p className="mt-1 text-xs text-gray-400">Category: {faq.category}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={addBlankFAQ}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-rose-300 hover:text-rose-500 transition-colors"
                >
                  + Add Custom FAQ
                </button>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-medium text-gray-800 mb-2">Review Your Wedding</h2>
                  <p className="text-gray-600 text-sm">Here&apos;s a summary of what you&apos;ve entered. You can always edit these details from your dashboard.</p>
                </div>

                {/* Summary */}
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 rounded-xl">
                    <h3 className="font-medium text-rose-800">{basics.partner1_name} & {basics.partner2_name}</h3>
                    {basics.wedding_date && <p className="text-rose-700 text-sm">{basics.wedding_date} {basics.wedding_time && `at ${basics.wedding_time}`}</p>}
                    {basics.dress_code && <p className="text-rose-600 text-sm mt-1">Dress Code: {basics.dress_code}</p>}
                  </div>

                  {(venues.ceremony_venue_name || venues.reception_venue_name) && (
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <h3 className="font-medium text-gray-800 mb-2">Venues</h3>
                      {venues.ceremony_venue_name && (
                        <p className="text-sm text-gray-600">Ceremony: {venues.ceremony_venue_name}</p>
                      )}
                      {!venues.same_venue && venues.reception_venue_name && (
                        <p className="text-sm text-gray-600">Reception: {venues.reception_venue_name}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-rose-600">{events.filter(e => e.name).length}</p>
                      <p className="text-xs text-gray-500">Events</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-rose-600">{accommodations.filter(a => a.hotel_name).length}</p>
                      <p className="text-xs text-gray-500">Hotels</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-rose-600">{faqs.filter(f => f.question && f.answer).length}</p>
                      <p className="text-xs text-gray-500">FAQs</p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Ready to go!</span> Once you finish, your wedding concierge will be live and ready to answer guest questions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <div>
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                {currentStep > 0 && currentStep < STEPS.length - 1 && (
                  <button
                    onClick={handleSkip}
                    className="px-6 py-3 text-gray-500 hover:text-gray-700"
                  >
                    Skip
                  </button>
                )}

                {currentStep < STEPS.length - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className="px-8 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleFinish}
                    disabled={isSaving}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Finishing...
                      </>
                    ) : (
                      'Finish Setup'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Need help?{' '}
            <Link href="/dashboard" className="text-rose-600 hover:text-rose-700">
              Go to Dashboard
            </Link>{' '}
            to edit your details anytime.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Main page component with Suspense boundary for useSearchParams
export default function SetupWizardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    }>
      <SetupWizardContent />
    </Suspense>
  );
}
