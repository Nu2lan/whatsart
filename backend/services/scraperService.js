const axios = require('axios');
const { log } = require('./logger');

/**
 * Searches iticket.az for events using their internal JSON API, bypassing UI limitations.
 * @param {string} target - The URL category or query to search for.
 * @returns {Array} List of found events with title, link, price, and date details.
 */
const searchITicket = async (target) => {
    try {
        let baseApiUrl = '';
        let isPaginated = false;
        
        // Normalize target to lowercase for case-insensitive checks
        const normalizedTarget = target.toLowerCase().trim();
        
        // Handle specialized theatre venue slug
        if (normalizedTarget === 'musical_theatre_venue' || normalizedTarget.includes('musical-theatre')) {
            isPaginated = true;
            // Use the universal events endpoint and filter later (venue_slug is unreliable)
            baseApiUrl = `https://api.iticket.az/az/v5/events?client=web`;
        } 
        // Handle direct category URL or internal slugs
        else if (normalizedTarget.startsWith('http') || ['concerts', 'theatre', 'all'].includes(normalizedTarget)) {
            isPaginated = true;
            let categorySlug = '';
            if (normalizedTarget.includes('concerts')) categorySlug = 'concerts';
            else if (normalizedTarget.includes('theatre')) categorySlug = 'theatre';
            
            if (categorySlug) {
                baseApiUrl = `https://api.iticket.az/az/v5/events?client=web&category_slug=${categorySlug}`;
            } else {
                baseApiUrl = `https://api.iticket.az/az/v5/events?client=web`;
            }
        } else {
            // Precise Search API using literal text target
            const encodedQuery = encodeURIComponent(target);
            baseApiUrl = `https://api.iticket.az/az/v5/events?client=web&q=${encodedQuery}`;
        }

        const fetchPage = async (page, customUrl = null) => {
            const url = customUrl ? `${customUrl}&page=${page}` : `${baseApiUrl}${baseApiUrl.includes('?') ? '&' : '?'}page=${page}`;
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                    'Referer': 'https://iticket.az/'
                }
            });
            const respData = response.data?.response;
            return respData?.events?.data || respData?.data || [];
        };

        // Standard fetch
        const pageNumbers = isPaginated ? Array.from({length: 40}, (_, i) => i + 1) : [1];
        let pageResults = await Promise.all(pageNumbers.map(p => fetchPage(p)));
        let allRawEvents = [].concat(...pageResults);

        // FALLBACK: If a textual search returns 0, try a shorter version (e.g. "Nazryn konserti" -> "Nazryn")
        if (!isPaginated && allRawEvents.length === 0 && target.includes(' ')) {
            const words = target.split(' ');
            if (words.length > 1) {
                const shorterQuery = words[0]; // Take the first word (likely the artist)
                log('SCRAPER FALLBACK', `Re-searching for: ${shorterQuery}`);
                const fallbackUrl = `https://api.iticket.az/az/v5/events?client=web&q=${encodeURIComponent(shorterQuery)}`;
                const fallbackResults = await fetchPage(1, fallbackUrl);
                allRawEvents = [].concat(...fallbackResults);
            }
        }
        
        // Flatten and deduplicate by event ID
        const uniqueItems = Array.from(new Map(allRawEvents.map(item => [item.id, item])).values());

        log('SCRAPER', `Target: ${target}, Fetched: ${uniqueItems.length} unique items across ${pageNumbers.length} pages`);
        
        const events = [];
        uniqueItems.forEach(item => {
            const dateStr = item.event_starts_at || item.starts_at;
            if (dateStr) {
                const dateObj = new Date(dateStr);
                const day = dateObj.getDate().toString().padStart(2, '0');
                const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                const year = dateObj.getFullYear();
                const hours = dateObj.getHours().toString().padStart(2, '0');
                const minutes = dateObj.getMinutes().toString().padStart(2, '0');
                const eventDate = `${day}.${month}.${year} ${hours}:${minutes}`;

                // Define link and price
                const eventLink = `https://iticket.az/events/${item.category?.slug || 'concerts'}/${item.slug}`;
                let priceText = 'Qiymət qeyd olunmayıb';
                if (item.min_price) {
                    priceText = item.max_price && item.min_price !== item.max_price 
                        ? `${item.min_price} - ${item.max_price} ₼` 
                        : `${item.min_price} ₼-dan`;
                }

                events.push({
                    id: item.id,
                    title: item.name,
                    date: eventDate,
                    venue: item.venue?.name || (item.venues && item.venues[0]?.name) || 'Məkan qeyd olunmayıb',
                    price: priceText,
                    minPrice: item.min_price || 0,
                    maxPrice: item.max_price || item.min_price || 0,
                    link: eventLink,
                    category: item.category?.name || 'Digər'
                });
            }
        });

        // HARD FILTER: If specifically searching for Musical Theatre, filter results precisely
        if (target.toLowerCase() === 'musical_theatre_venue') {
            const filteredEvents = events.filter(e => 
                e.venue.includes('Akademik Musiqili') || 
                e.venue.includes('Musical Theatre') ||
                e.venue.includes('Musiqili Teatr') ||
                e.venue.includes('Akademik Musiqi')
            );
            return filteredEvents;
        }

        return events;
    } catch (error) {
        console.error('Error fetching from iticket API:', error.message);
        return [];
    }
};

module.exports = {
    searchITicket
};
