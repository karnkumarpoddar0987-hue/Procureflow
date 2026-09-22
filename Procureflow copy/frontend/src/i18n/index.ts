import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import hi from './locales/hi.json'
import ur from './locales/ur.json'
import cg from './locales/cg.json'
import mr from './locales/mr.json'
import bn from './locales/bn.json'
import gu from './locales/gu.json'
import pa from './locales/pa.json'
import te from './locales/te.json'

const savedLang = localStorage.getItem('procureflow_lang') || 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ur: { translation: ur },
      cg: { translation: cg },
      mr: { translation: mr },
      bn: { translation: bn },
      gu: { translation: gu },
      pa: { translation: pa },
      te: { translation: te },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang)
  localStorage.setItem('procureflow_lang', lang)
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'cg', name: 'Chhattisgarhi', nativeName: 'छत्तीसगढ़ी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
]

export default i18n
