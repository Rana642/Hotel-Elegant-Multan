'use client';

import { useState } from 'react';
import { User, Phone, Mail, MessageSquare, Send } from 'lucide-react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Build WhatsApp message as fallback (no server-side form handler required)
    const waText = `Hello Hotel Elegant Executive Suites Multan!\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;
    window.open(`https://wa.me/923173330998?text=${encodeURIComponent(waText)}`, '_blank');
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 p-8 text-center">
        <p className="font-playfair font-semibold text-xl text-green-800 mb-2">Message Sent!</p>
        <p className="font-montserrat text-sm text-green-700">
          Your message was opened in WhatsApp. We'll reply shortly.
        </p>
        <button onClick={() => setSent(false)} className="mt-4 text-sm font-montserrat text-green-600 underline">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Your Name *
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
            <User size={14} className="text-[#E30613] shrink-0" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="flex-1 py-3 font-montserrat text-sm outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Phone / WhatsApp *
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
            <Phone size={14} className="text-[#E30613] shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 3xx xxx xxxx"
              className="flex-1 py-3 font-montserrat text-sm outline-none"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
          Email (optional)
        </label>
        <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
          <Mail size={14} className="text-[#E30613] shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 py-3 font-montserrat text-sm outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
          Subject
        </label>
        <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
          <MessageSquare size={14} className="text-[#E30613] shrink-0" />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Booking enquiry / general question"
            className="flex-1 py-3 font-montserrat text-sm outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
          Message *
        </label>
        <div className="flex items-start gap-2 border border-gray-200 px-3 pt-3 focus-within:border-[#1A0B2E] transition-colors">
          <MessageSquare size={14} className="text-[#E30613] shrink-0 mt-0.5" />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you need..."
            rows={5}
            className="flex-1 pb-3 font-montserrat text-sm outline-none resize-none"
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-red w-full py-4 flex items-center justify-center gap-2 disabled:opacity-60">
        <Send size={15} />
        {loading ? 'Opening WhatsApp...' : 'Send via WhatsApp'}
      </button>
      <p className="text-xs font-montserrat text-gray-400 text-center">
        Your message will open in WhatsApp — we reply fast.
      </p>
    </form>
  );
}
