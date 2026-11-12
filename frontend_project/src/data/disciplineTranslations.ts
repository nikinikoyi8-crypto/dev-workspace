import type { ArtCategory } from '@/types';
import type { PracticeQuestion } from '@/data/categories';

type Language = 'en' | 'fa';

const groupLabels: Record<string, string> = {
  'Visual Arts': 'هنرهای تجسمی',
  'Digital & New Media': 'هنر دیجیتال و رسانه‌های نوین',
  Photography: 'عکاسی',
  'Film & Video': 'فیلم و ویدئو',
  'Writing & Literature': 'نویسندگی و ادبیات',
  'Performing Arts': 'هنرهای نمایشی',
  'Music & Sound': 'موسیقی و صدا',
  'Sculpture & 3D Crafts': 'مجسمه‌سازی و صنایع سه‌بعدی',
  'Fashion & Textile': 'مد و هنرهای پارچه‌ای',
  'Architecture & Spatial Arts': 'معماری و هنرهای فضایی',
  'Graphic & Communication Arts': 'هنرهای گرافیک و ارتباطات',
  'Games & Interactive': 'بازی و هنرهای تعاملی',
};

const labels: Record<string, string> = {
  digital: 'هنرمند دیجیتال', painter: 'نقاش', illustrator: 'تصویرگر', sketch: 'طراح اسکچ', concept: 'هنرمند کانسپت', character: 'طراح شخصیت', comic: 'هنرمند کمیک', manga: 'هنرمند مانگا', cartoonist: 'کارتونیست', pixel: 'هنرمند پیکسل', '3d-artist': 'هنرمند سه‌بعدی', '3d-modeler': 'مدل‌ساز سه‌بعدی', sculptor: 'مجسمه‌ساز', ceramic: 'هنرمند سرامیک', potter: 'سفالگر', glass: 'هنرمند شیشه', wood: 'هنرمند چوب', metal: 'هنرمند فلز', jewelry: 'طراح جواهرات', fashion: 'طراح مد', textile: 'هنرمند پارچه', embroidery: 'هنرمند گلدوزی', calligraphy: 'خوشنویس', typography: 'تایپوگرافر', graphic: 'طراح گرافیک', logo: 'طراح لوگو', ui: 'طراح رابط کاربری', ux: 'طراح تجربه کاربری', motion: 'طراح موشن', animator: 'انیماتور', vfx: 'هنرمند جلوه‌های ویژه', 'video-editor': 'تدوینگر ویدئو', photographer: 'عکاس', drone: 'عکاس پهپاد', videographer: 'فیلم‌بردار', cinematographer: 'فیلم‌بردار سینمایی', 'film-director': 'کارگردان فیلم', screenwriter: 'فیلمنامه‌نویس', actor: 'بازیگر', 'voice-actor': 'بازیگر صدا', theatre: 'هنرمند تئاتر', musician: 'موسیقی‌دان', singer: 'خواننده', songwriter: 'ترانه‌سرا', composer: 'آهنگساز', producer: 'تهیه‌کننده موسیقی', dj: 'دی‌جی', instrumentalist: 'نوازنده', pianist: 'پیانیست', guitarist: 'گیتاریست', violinist: 'ویولنیست', drummer: 'درامر', dancer: 'رقصنده', choreographer: 'طراح رقص', performance: 'هنرمند پرفورمنس', poet: 'شاعر', writer: 'نویسنده', novelist: 'رمان‌نویس', storyteller: 'قصه‌گو', tattoo: 'هنرمند تتو', makeup: 'هنرمند میکاپ', nail: 'هنرمند طراحی ناخن', floral: 'هنرمند گل‌آرایی', architect: 'معمار', interior: 'طراح داخلی', industrial: 'طراح صنعتی', product: 'طراح محصول', environment: 'هنرمند محیطی', 'game-artist': 'هنرمند بازی', 'level-designer': 'طراح مرحله', 'game-animator': 'انیماتور بازی', 'ai-artist': 'هنرمند هوش مصنوعی', nft: 'هنرمند NFT', traditional: 'هنرمند سنتی', 'mixed-media': 'هنرمند ترکیبی', street: 'هنرمند خیابانی', mural: 'هنرمند نقاشی دیواری', printmaker: 'هنرمند چاپ', resin: 'هنرمند رزین', paper: 'هنرمند کاغذ', origami: 'هنرمند اوریگامی', leather: 'هنرمند چرم', miniature: 'هنرمند مینیاتور', 'toy-designer': 'طراح اسباب‌بازی', puppet: 'هنرمند عروسکی',
};

export function localizedDisciplineLabel(discipline: ArtCategory, lang: Language) {
  return lang === 'fa' ? labels[discipline.id] || discipline.label : discipline.label;
}

export function localizedGroupLabel(group: string, lang: Language) {
  return lang === 'fa' ? groupLabels[group] || group : group;
}

const practiceLabels: Record<string, string> = {
  'What do you create?': 'چه چیزی خلق می‌کنی؟', 'What mediums do you use?': 'از چه موادی استفاده می‌کنی؟', 'What do you photograph?': 'از چه چیزهایی عکاسی می‌کنی؟', "What's your role?": 'نقش تو چیست؟', 'What do you write?': 'چه چیزی می‌نویسی؟', "What's your discipline?": 'رشتهٔ تو چیست؟', 'What genres do you work in?': 'در چه سبک‌هایی فعالیت می‌کنی؟', 'What do you work with?': 'با چه موادی کار می‌کنی؟', "What's your focus?": 'تمرکز اصلی تو چیست؟', 'What do you design?': 'چه چیزی طراحی می‌کنی؟',
};

const practiceOptions: Record<string, string> = {
  Portraits: 'پرتره', Landscapes: 'منظره', Abstract: 'انتزاعی', 'Still Life': 'طبیعت بی‌جان', Conceptual: 'مفهومی', Figurative: 'فیگوراتیو', Experimental: 'تجربی', Other: 'سایر', Oil: 'رنگ روغن', Acrylic: 'اکریلیک', Watercolor: 'آبرنگ', Gouache: 'گواش', Ink: 'مرکب', Pastel: 'پاستل', Charcoal: 'ذغال', 'Mixed Media': 'ترکیب مواد', Digital: 'دیجیتال', People: 'افراد', Fashion: 'مد', Nature: 'طبیعت', Architecture: 'معماری', Street: 'خیابان', Products: 'محصولات', Events: 'رویدادها', Wildlife: 'حیات وحش', 'Fine Art': 'هنرهای زیبا', Astro: 'نجوم', Macro: 'ماکرو', Songs: 'ترانه‌ها', Compositions: 'قطعات موسیقی', Beats: 'بیت‌ها', 'Sound Design': 'طراحی صدا', Scores: 'موسیقی متن', 'Live Performances': 'اجرای زنده', Remixes: 'ریمیکس', Pop: 'پاپ', Rock: 'راک', 'Hip-Hop': 'هیپ‌هاپ', Electronic: 'الکترونیک', Jazz: 'جاز', Classical: 'کلاسیک', Folk: 'فولک', 'R&B': 'آراندبی', 'Beginner': 'مبتدی', Hobbyist: 'تفننی', Professional: 'حرفه‌ای',
};

export function localizedPracticeQuestion(question: PracticeQuestion, lang: Language): PracticeQuestion {
  if (lang !== 'fa') return question;
  return { ...question, label: practiceLabels[question.label] || question.label, options: question.options.map((option) => practiceOptions[option] || option) };
}
