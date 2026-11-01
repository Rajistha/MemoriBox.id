import React from 'react';
import { FiChevronDown } from 'react-icons/fi';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';


export function FaqSection({ faqs = [] }) {
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="py-16 md:py-24 bg-surface border-y border-line">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <SectionHeader eyebrow="FAQ" title="Pertanyaan yang sering diajukan." className="mb-10" />
        <Reveal className="divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="list-none cursor-pointer min-h-14 py-3 flex items-center justify-between gap-4 font-semibold text-ink-900">
                {f.q}
                <FiChevronDown className="shrink-0 text-ink-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-5 text-sm text-ink-700 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export default FaqSection;
