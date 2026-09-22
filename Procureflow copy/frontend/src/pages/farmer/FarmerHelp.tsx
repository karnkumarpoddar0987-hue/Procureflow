import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, ChevronDown, Volume2, Phone } from 'lucide-react'
import { cn } from '@/utils/cn'

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-alt transition-colors">
        <span className="font-medium">{question}</span>
        <ChevronDown className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <p className="px-4 pb-4 text-sm text-muted-foreground">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FarmerHelp() {
  const { t } = useTranslation()

  const faqs = [
    { q: t('help.howToBook'), a: t('help.howToBook_ans') },
    { q: t('help.howQueue'), a: t('help.howQueue_ans') },
    { q: t('help.howProcurement'), a: t('help.howProcurement_ans') },
    { q: t('help.howPayment'), a: t('help.howPayment_ans') },
    { q: t('help.assistedMode'), a: t('help.assistedMode_ans') },
  ]

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utter)
    }
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold">{t('help.title')}</h1>

      {/* Voice assistance */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Volume2 size={22} />
          <h2 className="font-semibold">{t('help.assistedMode')}</h2>
        </div>
        <p className="text-white/80 text-sm mb-4">{t('help.assistedMode_ans')}</p>
        <button onClick={() => speak('Welcome to Procureflow. Tap any button below to hear help.')}
          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Volume2 size={14} className="inline mr-2" /> Start Voice Help
        </button>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-semibold mb-3">{t('help.faq')}</h2>
        <div className="space-y-2">
          {faqs.map(({ q, a }, i) => (
            <FAQItem key={i} question={q} answer={a} />
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Phone className="text-primary-600" size={20} />
          <h2 className="font-semibold">{t('help.contact')}</h2>
        </div>
        <p className="text-muted-foreground text-sm">{t('help.callUs')}</p>
      </div>
    </div>
  )
}
