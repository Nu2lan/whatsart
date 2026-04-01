const { OpenAI } = require('openai');
const { searchITicket } = require('./scraperService');
const fs = require('fs');
const { log } = require('./logger');

let _openai;
const getOpenAI = () => {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is missing in .env file');
        }
        _openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return _openai;
};

// System prompt setting the context in Azerbaijani
const systemInstruction = `Siz Azərbaycan Dövlət Akademik Musiqili Teatrının rəsmi müştəri xidmətləri asistanısınız. 
Bütün suallara Azərbaycan dilində nəzakətli və peşəkar şəkildə cavab verin.

Sizin fəaliyyət sahəniz YALNIZ Azərbaycan Dövlət Akademik Musiqili Teatrı və orada baş tutacaq tamaşalarla məhdudlaşır.
Qaydalar:
1. YALNIZ Musiqili Teatrın tamaşaları və teatrın özü haqqında suallara cavab verin.
2. Tamaşaların siyahısını təqdim edərkən HEÇ VAXT bilet linklərini (iTicket linklərini) birbaşa göndərməyin.
3. Siyahı göstərdikdən sonra mütləq soruşun: "Hansı tamaşa üçün bilet almaq istəyirsiniz?"
4. Kənar mövzular (digər teatrlar, konsertlər) haqqında soruşularsa, nəzakətlə bildirin ki, siz yalnız Musiqili Teatr üzrə ixtisaslaşmısınız.

ÇOX VACİB: Siz tamaşa adlarını, tarixləri və qiymətləri özünüz UYDURMAMALISINIZ. HEÇ VAXT öz biliklərinizə əsasən tamaşa siyahısı yaratmayın.
Bunun əvəzinə, tamaşa/tədbir/bilet/tarix/ay haqqında sual olduqda YALNIZ aşağıdakı axtarış teqlərini yazın və dayandırın:
[TARGET: musical_theatre_venue] [DATE: DD.MM] [NAME: tamasa_adi]
- TARGET: Həmişə "musical_theatre_venue" olaraq saxlayın.
- DATE: Əgər konkret tarix varsa DD.MM, əgər yalnız AY soruşulursa onu .MM formatında (məs: .04) qeyd edin.
- NAME: Tamaşanın adını qeyd edin, yoxdursa yazmayın.

Teqlərdən sonra HEÇ BİR tamaşa siyahısı, ad və ya tarix yazmayın. Sistem avtomatik olaraq real məlumatları tapacaq.`;

const generateBotReply = async (userMessage) => {
    try {
        const openaiClient = getOpenAI();
        const response = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userMessage }
            ],
            temperature: 0.3,
        });

        let responseText = response.choices[0].message.content;
        log('AI RAW', `${responseText}`);

        // Force a search if the user asks for events without specific tags
        const searchKeywords = ['aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr', 'yanvar', 'fevral', 'mart', 'tamaşa', 'tədbir', 'nə var', 'nə vaxt', 'bilet', 'seans', 'konsert', 'qiymət', 'bu ay', 'gələn ay', 'gelen ay'];
        const needsSearch = searchKeywords.some(kw => userMessage.toLowerCase().includes(kw));

        if (!responseText.includes('[TARGET:') && needsSearch) {
            responseText = `[TARGET: musical_theatre_venue] ${responseText}`;
        }

        const hasSearchTrigger = responseText.includes('[TARGET:');

        if (hasSearchTrigger) {
            const dateMatch = responseText.match(/\[DATE:\s*([^\]]+)\]/i);
            const nameMatch = responseText.match(/\[NAME:\s*([^\]]+)\]/i);

            let dateFilter = dateMatch ? dateMatch[1].trim() : null;
            const nameFilter = nameMatch ? nameMatch[1].trim().toLowerCase() : null;

            // Dynamic month detection from user message
            const msgLower = userMessage.toLowerCase();
            const monthMap = {
                'yanvar': '.01', 'fevral': '.02', 'mart': '.03', 'aprel': '.04',
                'may': '.05', 'iyun': '.06', 'iyul': '.07', 'avqust': '.08',
                'sentyabr': '.09', 'oktyabr': '.10', 'noyabr': '.11', 'dekabr': '.12'
            };

            if (!dateFilter) {
                // "bu ay" = this month, "gələn ay" / "gelen ay" = next month
                if (msgLower.includes('bu ay')) {
                    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
                    dateFilter = `.${currentMonth}`;
                } else if (msgLower.includes('gələn ay') || msgLower.includes('gelen ay')) {
                    let nextMonth = new Date().getMonth() + 2;
                    if (nextMonth > 12) nextMonth = 1;
                    dateFilter = `.${nextMonth.toString().padStart(2, '0')}`;
                } else {
                    // Check for month names
                    for (const [name, code] of Object.entries(monthMap)) {
                        if (msgLower.includes(name)) {
                            dateFilter = code;
                            break;
                        }
                    }
                }
            }

            log('AI ACTION', `Date: ${dateFilter}, Name: ${nameFilter}`);

            let events = await searchITicket('musical_theatre_venue');

            // Apply Date/Month Filter
            if (dateFilter && events.length > 0) {
                if (dateFilter.startsWith('.')) {
                    events = events.filter(e => e.date.includes(dateFilter));
                } else {
                    events = events.filter(e => e.date.trim().startsWith(dateFilter.trim()));
                }
            }

            // Apply Name Filter (Tamaşa adı)
            if (nameFilter && events.length > 0 && !['null', 'tədbirlər', 'tamaşalar'].includes(nameFilter)) {
                const filtered = events.filter(e => e.title.toLowerCase().includes(nameFilter));
                if (filtered.length > 0) events = filtered;
            }

            if (events && events.length > 0) {
                // Sort by date
                events.sort((a, b) => {
                    const d1 = a.date.split(' ')[0].split('.').reverse().join('');
                    const d2 = b.date.split(' ')[0].split('.').reverse().join('');
                    return d1.localeCompare(d2);
                });

                let msg = `🎭 *Azərbaycan Dövlət Akademik Musiqili Teatrında tamaşalar:*\n\n`;
                events.forEach(e => {
                    msg += `⭐ *${e.title}*\n📅 Tarix: ${e.date}\n💰 Qiymət: ${e.price}\n\n`;
                });
                msg += "Hansı tamaşa üçün bilet almaq istəyirsiniz? 🎟️";

                // We'll pass the events to the caller so they can be saved in the session
                return { text: msg, events: events };
            } else {
                return { text: `Bağışlayın, hazırda Musiqili Teatrda belə bir tamaşa və ya bu tarixdə aktiv seans tapılmadı. 😔 Başqa bir tarixlə və ya tamaşa adı ilə yoxlaya bilərsiniz.`, events: [] };
            }
        }

        // Return clean message without internal tags
        return { text: responseText.replace(/\[[^\]]+\]/g, '').trim(), events: [] };
    } catch (error) {
        log('AI ERROR', `${error.message}`);
        console.error('Error in generateBotReply:', error);
        return { text: 'Bağışlayın, hazırda sorğunuzu emal edə bilmirəm. Zəhmət olmasa bir az sonra yenidən cəhd edin.', events: [] };
    }
};

const suggestImprovements = async (draftText) => {
    try {
        const prompt = `Musiqi/teatr tədbirləri üçün kopyarayter (copywriter) mütəxəssisi kimi çıxış edin. Kütləvi WhatsApp mesajı üçün aşağıdakı qaralamanı təhlil edin:
"${draftText}"

Azərbaycan dilində 2-3 təkmilləşdirilmiş variant təqdim edin. Onları daha cəlbedici edin, tonunu yaxşılaşdırın və musiqi/teatr izləyicilərinə uyğun aydın bir 'call-to-action' (fəaliyyətə çağırış) əlavə edin. Hər variantı aydın şəkildə ayırın.`;

        const openaiClient = getOpenAI();
        const response = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error getting OpenAI suggestions:', error);
        throw new Error('Hazırda mətni təhlil etmək mümkün deyil.');
    }
}

const enhanceChatMessage = async (draftText) => {
    try {
        const prompt = `Aşağıdakı mətni WhatsApp üzərində müştəri/şəxs ilə 1-ə-1 yazışma üçün redaktə edin. Mətnin mənasını qoruyaraq onu daha professional, aydın və nəzakətli (ümumi və səmimi) Azərbaycan dilində yenidən yazın. Yalnız yenidən yazılmış son mətni qaytarın, heç bir əlavə şərh və qeyd yazmayın:\n\n"${draftText}"`;

        const openaiClient = getOpenAI();
        const response = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        log('ENHANCE ERROR', `${error.message}\n${error.stack}`);
        console.error('Error enhancing message:', error);
        throw new Error(error.message || 'Süni intellekt hazırda mətni təhlil edə bilmir.');
    }
}

module.exports = {
    generateBotReply,
    suggestImprovements,
    enhanceChatMessage
};
