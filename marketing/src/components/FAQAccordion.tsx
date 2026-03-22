import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: "Is the free plan really free forever?",
    a: "Yes. Free plan never expires. No credit card required. You can run 5 URL scans and 3 code scans every month at no cost."
  },
  {
    q: "What happens when I hit my scan limit?",
    a: "Your scans pause until next month. Or upgrade to Pro for unlimited scans immediately."
  },
  {
    q: "Can I scan any website?",
    a: "You can only scan websites you own or have explicit permission to test. We verify this with a terms confirmation on every scan."
  },
  {
    q: "How is my code handled when I upload a ZIP?",
    a: "Your code is analyzed in an isolated container and deleted immediately after the scan completes. We never store your source code."
  },
  {
    q: "What AI models power the fixes?",
    a: "We use a combination of OpenRouter (Qwen3 Coder, Llama 3.3) and Gemini 2.0 Flash for fast, accurate fix generation."
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, full refund within 14 days of purchase, no questions asked."
  }
];

const FAQAccordion = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
            {faqs.map((faq, i) => (
                <div key={i} className="border-b border-white/5 last:border-0">
                    <button
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        className="w-full py-8 flex justify-between items-center text-left group transition-all duration-300"
                    >
                        <span className={`text-lg sm:text-xl font-head font-bold tracking-tight transition-colors ${
                            openIndex === i ? 'text-white' : 'text-muted group-hover:text-white'
                        }`}>
                            {faq.q}
                        </span>
                        <motion.div
                            animate={{ rotate: openIndex === i ? 180 : 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className={`p-2 rounded-full glass border transition-all ${
                                openIndex === i ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-white/5 border-transparent text-dim'
                            }`}
                        >
                            <ChevronDown className="w-5 h-5" />
                        </motion.div>
                    </button>
                    <AnimatePresence>
                        {openIndex === i && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                            >
                                <p className="text-muted text-base leading-relaxed pb-8 max-w-2xl px-1">
                                    {faq.a}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

export default FAQAccordion;
