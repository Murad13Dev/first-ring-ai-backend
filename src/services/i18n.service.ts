import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

interface Translations {
  [key: string]: any;
}

export class I18nService {
  private translations: Map<string, Translations> = new Map();
  private supportedLanguages = [
    'en', // English
    'ru', // Russian
    'es', // Spanish
    'it', // Italian
    'fr', // French
    'zh', // Chinese
    'ja', // Japanese
    'fa', // Farsi/Persian
    'tl', // Tagalog/Filipino
  ];

  constructor() {
    this.loadTranslations();
  }

  /**
   * Load all translation files
   */
  private loadTranslations() {
    try {
      for (const lang of this.supportedLanguages) {
        const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
        
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.translations.set(lang, JSON.parse(content));
          logger.info(`Loaded translations for: ${lang}`);
        } else {
          logger.warn(`Translation file not found: ${lang}.json`);
        }
      }
    } catch (error) {
      logger.error('Load translations error', { error });
    }
  }

  /**
   * Get translation by key
   */
  t(lang: string, key: string, params?: Record<string, any>): string {
    try {
      // Default to English if language not supported
      if (!this.supportedLanguages.includes(lang)) {
        lang = 'en';
      }

      const translations = this.translations.get(lang);
      if (!translations) {
        return key;
      }

      // Navigate nested keys (e.g., "greeting.welcome")
      const keys = key.split('.');
      let value: any = translations;

      for (const k of keys) {
        value = value[k];
        if (value === undefined) {
          return key;
        }
      }

      // Replace parameters (e.g., {{businessName}})
      if (typeof value === 'string' && params) {
        return this.interpolate(value, params);
      }

      return value;
    } catch (error) {
      logger.error('Translation error', { error, lang, key });
      return key;
    }
  }

  /**
   * Interpolate parameters in string
   */
  private interpolate(str: string, params: Record<string, any>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Detect language from phone number or user preference
   */
  detectLanguage(phoneNumber?: string, userLang?: string): string {
    // If user specified language
    if (userLang && this.supportedLanguages.includes(userLang)) {
      return userLang;
    }

    // Detect from phone number country code
    if (phoneNumber) {
      const countryCode = phoneNumber.substring(0, 4);
      
      const languageMap: Record<string, string> = {
        '+1': 'en',    // USA/Canada
        '+7': 'ru',    // Russia/Kazakhstan
        '+34': 'es',   // Spain
        '+52': 'es',   // Mexico
        '+39': 'it',   // Italy
        '+33': 'fr',   // France
        '+86': 'zh',   // China
        '+81': 'ja',   // Japan
        '+98': 'fa',   // Iran
        '+63': 'tl',   // Philippines
      };

      for (const [code, lang] of Object.entries(languageMap)) {
        if (phoneNumber.startsWith(code)) {
          return lang;
        }
      }
    }

    // Default to English
    return 'en';
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages.map((code) => ({
      code,
      name: this.getLanguageName(code),
      nativeName: this.getLanguageNativeName(code),
    }));
  }

  /**
   * Get language name in English
   */
  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      en: 'English',
      ru: 'Russian',
      es: 'Spanish',
      it: 'Italian',
      fr: 'French',
      zh: 'Chinese',
      ja: 'Japanese',
      fa: 'Persian',
      tl: 'Tagalog',
    };
    return names[code] || code;
  }

  /**
   * Get language name in native language
   */
  private getLanguageNativeName(code: string): string {
    const names: Record<string, string> = {
      en: 'English',
      ru: 'Русский',
      es: 'Español',
      it: 'Italiano',
      fr: 'Français',
      zh: '中文',
      ja: '日本語',
      fa: 'فارسی',
      tl: 'Tagalog',
    };
    return names[code] || code;
  }

  /**
   * Get Twilio language code for speech recognition
   */
  getTwilioLanguage(lang: string): string {
    const twilioLangs: Record<string, string> = {
      en: 'en-US',
      ru: 'ru-RU',
      es: 'es-ES',
      it: 'it-IT',
      fr: 'fr-FR',
      zh: 'zh-CN',
      ja: 'ja-JP',
      fa: 'fa-IR',
      tl: 'tl-PH',
    };
    return twilioLangs[lang] || 'en-US';
  }

  /**
   * Get Twilio voice for TTS
   */
  getTwilioVoice(lang: string): string {
    const voices: Record<string, string> = {
      en: 'alice',
      ru: 'alice',
      es: 'alice',
      it: 'alice',
      fr: 'alice',
      zh: 'alice',
      ja: 'alice',
      fa: 'alice',
      tl: 'alice',
    };
    return voices[lang] || 'alice';
  }

  /**
   * Get OpenAI system prompt for language
   */
  getOpenAISystemPrompt(lang: string, businessName: string, businessType: string): string {
    const prompts: Record<string, string> = {
      en: `You are an AI assistant for ${businessName}, a ${businessType}. Be friendly, professional, and helpful. Respond in English.`,
      ru: `Вы AI-ассистент для ${businessName}, ${businessType}. Будьте дружелюбны, профессиональны и полезны. Отвечайте на русском языке.`,
      es: `Eres un asistente de IA para ${businessName}, un ${businessType}. Sé amable, profesional y servicial. Responde en español.`,
      it: `Sei un assistente AI per ${businessName}, un ${businessType}. Sii cordiale, professionale e disponibile. Rispondi in italiano.`,
      fr: `Vous êtes un assistant IA pour ${businessName}, un ${businessType}. Soyez aimable, professionnel et serviable. Répondez en français.`,
      zh: `您是${businessName}的AI助手，这是一个${businessType}。请友好、专业和乐于助人。用中文回答。`,
      ja: `あなたは${businessName}のAIアシスタントです。${businessType}です。親切で、プロフェッショナルで、役立つようにしてください。日本語で答えてください。`,
      fa: `شما دستیار هوش مصنوعی ${businessName} هستید، یک ${businessType}. دوستانه، حرفه‌ای و مفید باشید. به فارسی پاسخ دهید.`,
      tl: `Ikaw ay isang AI assistant para sa ${businessName}, isang ${businessType}. Maging mabait, propesyonal, at makatulong. Sumagot sa Tagalog.`,
    };
    return prompts[lang] || prompts['en'];
  }
}

export default new I18nService();
