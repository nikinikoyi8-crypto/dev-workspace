import type { PracticeQuestion } from '@/data/categories';

const faLabels: Record<string, string> = {
  'What do you create?': 'چه چیزی خلق می‌کنی؟',
  'What mediums do you use?': 'از چه موادی استفاده می‌کنی؟',
  'What tools/software do you use?': 'از چه ابزار یا نرم‌افزاری استفاده می‌کنی؟',
  'What do you photograph?': 'از چه چیزهایی عکاسی می‌کنی؟',
  'What\'s your role?': 'نقش تو چیست؟',
  'What do you write?': 'چه چیزی می‌نویسی؟',
  'What\'s your discipline?': 'رشتهٔ تو چیست؟',
  'What genres do you work in?': 'در چه سبک‌هایی کار می‌کنی؟',
  'What do you work with?': 'با چه موادی کار می‌کنی؟',
  'What\'s your focus?': 'تمرکز اصلی تو چیست؟',
  'What do you design?': 'چه چیزی طراحی می‌کنی؟',
  'What best describes your work?': 'کدام گزینه کار تو را بهتر توصیف می‌کند؟',
};

const faOptions: Record<string, string> = {
  Portraits: 'پرتره', Landscapes: 'منظره', Abstract: 'انتزاعی', 'Still Life': 'طبیعت بی‌جان', Conceptual: 'مفهومی', Figurative: 'فیگوراتیو', Experimental: 'تجربی',
  Oil: 'رنگ روغن', Acrylic: 'اکریلیک', Watercolor: 'آبرنگ', Gouache: 'گواش', Ink: 'مرکب', Pastel: 'پاستل', Charcoal: 'زغال', 'Mixed Media': 'تکنیک ترکیبی', Digital: 'دیجیتال',
  'Digital Painting': 'نقاشی دیجیتال', 'Concept Art': 'کانسپت آرت', 'Character Art': 'طراحی شخصیت', 'Environment Art': 'طراحی محیط', 'Pixel Art': 'پیکسل آرت', '3D Models': 'مدل سه‌بعدی', '3D Sculpts': 'مجسمه‌سازی سه‌بعدی', 'Generative/AI Art': 'هنر مولد / هوش مصنوعی',
  Photoshop: 'فتوشاپ', Procreate: 'پروکریت', Blender: 'بلندر', ZBrush: 'زی‌براش', 'Clip Studio Paint': 'کلیپ استودیو', 'Substance Painter': 'سابستنس پینتر', 'Midjourney/AI tools': 'میدجرنی / ابزارهای هوش مصنوعی',
  People: 'افراد', Fashion: 'مد', Nature: 'طبیعت', Architecture: 'معماری', Street: 'خیابان', Products: 'محصولات', Events: 'رویدادها', Wildlife: 'حیات وحش', 'Fine Art': 'هنر fine art', Astro: 'نجومی', Macro: 'ماکرو',
  'Short Films': 'فیلم کوتاه', Documentaries: 'مستند', Animation: 'انیمیشن', 'Music Videos': 'موزیک‌ویدئو', Commercials: 'تبلیغات', 'VFX Sequences': 'سکانس‌های جلوه ویژه', 'Stop Motion': 'استاپ‌موشن', 'Experimental Film': 'فیلم تجربی',
  Director: 'کارگردان', Cinematographer: 'فیلم‌بردار', Editor: 'تدوینگر', Screenwriter: 'فیلمنامه‌نویس', Animator: 'انیماتور', 'VFX Artist': 'هنرمند جلوه‌های ویژه',
  Poetry: 'شعر', Fiction: 'داستانی', 'Short Stories': 'داستان کوتاه', Novels: 'رمان', Essays: 'مقاله', Screenplays: 'فیلمنامه', 'Comics/Graphic Novels': 'کمیک / رمان تصویری', Journalism: 'روزنامه‌نگاری',
  Acting: 'بازیگری', Theater: 'تئاتر', Ballet: 'باله', 'Contemporary Dance': 'رقص معاصر', 'Hip-Hop Dance': 'رقص هیپ‌هاپ', 'Traditional Dance': 'رقص سنتی', Choreography: 'رقص‌پردازی', 'Performance Art': 'هنر اجرا', 'Circus Arts': 'هنرهای سیرک',
  Songs: 'ترانه', Compositions: 'قطعه موسیقی', Beats: 'بیت', 'Sound Design': 'طراحی صدا', Scores: 'موسیقی متن', 'Live Performances': 'اجرای زنده', Remixes: 'ریمیکس', Pop: 'پاپ', Rock: 'راک', 'Hip-Hop': 'هیپ‌هاپ', Electronic: 'الکترونیک', Jazz: 'جاز', Classical: 'کلاسیک', Folk: 'فولک', 'R&B': 'آراندبی',
  'Clay/Ceramic': 'خاک رس / سرامیک', Wood: 'چوب', Metal: 'فلز', Stone: 'سنگ', Glass: 'شیشه', Resin: 'رزین', Paper: 'کاغذ', 'Mixed Materials': 'مواد ترکیبی', 'Figurative Sculpture': 'مجسمه فیگوراتیو', 'Abstract Sculpture': 'مجسمه انتزاعی', 'Functional Pottery': 'سفال کاربردی', 'Installation Art': 'هنر چیدمان', 'Jewelry-Scale Work': 'آثار در مقیاس جواهر',
  'Clothing/Garments': 'لباس', 'Textile Art': 'هنر پارچه', Embroidery: 'گلدوزی', Knitwear: 'بافتنی', Jewelry: 'جواهرات', Accessories: 'اکسسوری', 'Costume Design': 'طراحی لباس', Design: 'طراحی', 'Production/Making': 'ساخت و تولید', Styling: 'استایلینگ', 'Custom Commissions': 'سفارش اختصاصی',
  'Residential Spaces': 'فضاهای مسکونی', 'Commercial Spaces': 'فضاهای تجاری', Furniture: 'مبلمان', 'Product Design': 'طراحی محصول', 'Landscape/Garden Design': 'طراحی منظر / باغ', 'Exhibition/Set Design': 'طراحی نمایشگاه / صحنه',
  'Branding/Logos': 'برندینگ / لوگو', Posters: 'پوستر', Typography: 'تایپوگرافی', 'Editorial Design': 'طراحی editorial', Packaging: 'بسته‌بندی', 'UI Design': 'طراحی رابط کاربری', 'UX Design': 'طراحی تجربه کاربری', 'Motion Graphics': 'موشن گرافیک',
  'Game Art': 'هنر بازی', 'Character Design': 'طراحی شخصیت', 'Environment Design': 'طراحی محیط', 'Level Design': 'طراحی مرحله', 'Game Animation': 'انیمیشن بازی', 'UI/UX for Games': 'رابط و تجربه کاربری بازی', 'Concept Art for Games': 'کانسپت آرت بازی',
  Other: 'سایر', Beginner: 'مبتدی', Hobbyist: 'سرگرمی', Professional: 'حرفه‌ای',
};

export function localizePracticeQuestion(question: PracticeQuestion, language: 'en' | 'fa'): PracticeQuestion {
  if (language === 'en') return question;
  return {
    ...question,
    label: faLabels[question.label] || question.label,
    options: question.options.map((option) => faOptions[option] || option),
  };
}
