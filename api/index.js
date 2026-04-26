const axios = require('axios');

// NEW API - datacorporation.com.pk
const TARGET_URL = 'https://ownerdetail.datacorporation.com.pk/result-page/';
const REFERER = 'https://ownerdetail.datacorporation.com.pk/track-number/';

// Cookies from browser
const COOKIES = {
  _ga: 'GA1.1.1455301204.1770130461',
  __gads: 'ID=d6cf01242b53db4b:T=1770130463:RT=1770130463:S=ALNI_MakDvPYZ9f0HxxsHhucgw_Dqo7ibQ',
  __gpi: 'UID=000012ee6279eedc:T=1770130463:RT=1770130463:S=ALNI_Mbs-ZC8aSGArLlht0Qy47hxzx3O3w',
  __eoi: 'ID=a0a706ab0de49769:T=1770130463:RT=1770130463:S=AA-AfjYNXg4xUss8WrHIHleiA7gd',
  _ga_HZX03VHGDT: 'GS2.1.s1770130460$o1$g1$t1770130544$j60$l0$h21430292',
  _ga_2BL9GP4ZMR: 'GS2.1.s1770130463$o1$g1$t1770130544$j60$l0$h0'
};

function getCookieString() {
  return Object.entries(COOKIES)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Helper function for Pretty Print JSON
  const sendResponse = (data) => {
    res.send(JSON.stringify(data, null, 4));
  };

  const { search } = req.method === 'GET' ? req.query : req.body;

  if (!search) {
    return sendResponse({
      success: false,
      message: '❌ Please provide search parameter (Phone Number or CNIC)',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }

  // Smart Search Cleaning: Handles both Mobile (starts with 0) and CNIC (13 digits)
  const cleanSearch = search.replace(/\D/g, '');
  let queryParam = cleanSearch;
  if (cleanSearch.length < 13 && !cleanSearch.startsWith('0')) {
    queryParam = '0' + cleanSearch;
  }

  try {
    const response = await axios.get(TARGET_URL, {
      params: { sim_info_mobile: queryParam },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ur-PK;q=0.8,ur;q=0.7',
        'Referer': REFERER,
        'Cookie': getCookieString(),
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 20000
    });

    const html = response.data;
    const result = parseHTML(html, queryParam);

    if (result.found) {
      return sendResponse({
        success: true,
        message: `✅ Record found - ${result.records.length} record(s)`,
        records: result.records,
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    } else {
      return sendResponse({
        success: false,
        message: '❌ No record found for this search',
        records: [],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    }

  } catch (error) {
    return sendResponse({
      success: false,
      message: '⚠️ Error: ' + error.message,
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }
};

// Advanced HTML parser for Multiple Records (CNIC Support)
function parseHTML(html, searchQuery) {
  let records = [];
  
  try {
    // 1. Clean HTML from dangerous tags (CSS, JS, Meta) that cause parsing bugs
    let cleanBody = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                        .replace(/<meta[^>]*>/gi, '')
                        .replace(/<link[^>]*>/gi, '')
                        .replace(//g, '');

    // 2. Extract tables
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tables = [];
    let match;
    while ((match = tableRegex.exec(cleanBody)) !== null) {
        tables.push(match[1]);
    }

    // 3. Parse tables
    if (tables.length > 0) {
        tables.forEach(tableHtml => {
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let rows = [];
            let rowMatch;
            
            while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
                const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
                let cells = [];
                let cellMatch;
                while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                    cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
                }
                if (cells.length > 0) rows.push(cells);
            }

            if (rows.length === 0) return;

            // Strategy A: Vertical Table (Key in col 1, Value in col 2)
            if (rows.every(r => r.length === 2) || rows[0].length === 2) {
                let currentRecord = {};
                rows.forEach(r => {
                    if (r.length >= 2) {
                        let key = r[0].toLowerCase();
                        let val = r[1];
                        
                        // If we see 'name' again, push previous record (Handles multiple records in one long table)
                        if (key.includes('name') && currentRecord.Name) {
                            records.push({...currentRecord});
                            currentRecord = {};
                        }
                        assignValue(currentRecord, key, val);
                    }
                });
                if (Object.keys(currentRecord).length > 0) records.push(currentRecord);
            } 
            // Strategy B: Horizontal Table (Headers top, values below)
            else {
                let headers = rows[0].map(h => h.toLowerCase());
                for (let i = 1; i < rows.length; i++) {
                    let r = rows[i];
                    let currentRecord = {};
                    headers.forEach((h, index) => {
                        if (r[index]) assignValue(currentRecord, h, r[index]);
                    });
                    if (Object.keys(currentRecord).length > 0) records.push(currentRecord);
                }
            }
        });
    }

    // Process and finalize records to ensure layout matches requirements
    let formattedRecords = [];
    records.forEach(rec => {
       if (rec.Name || rec.Mobile || rec.CNIC) {
           let cnic = (rec.CNIC || '').replace(/\D/g, '');
           let mobile = (rec.Mobile || '').replace(/\D/g, '');
           
           // Fallback to search query if mobile is empty on CNIC search
           if (!mobile && searchQuery.length < 12) mobile = searchQuery;
           
           let prov = rec.Province || 'N/A';
           let gen = rec.Gender || 'N/A';
           
           // Auto-calculate Province & Gender from CNIC (highly reliable)
           if (cnic.length >= 13) {
               let lastDigit = parseInt(cnic.charAt(12));
               gen = (lastDigit % 2 === 0) ? 'Female' : 'Male';
               
               let firstDigit = cnic.charAt(0);
               const pMap = { '1': 'Khyber Pakhtunkhwa', '2': 'FATA', '3': 'Punjab', '4': 'Sindh', '5': 'Balochistan', '6': 'Islamabad', '7': 'Gilgit-Baltistan', '8': 'AJK' };
               prov = pMap[firstDigit] || 'N/A';
           }
           
           formattedRecords.push({
               Name: rec.Name || 'N/A',
               Mobile: mobile || 'N/A',
               CNIC: cnic || 'N/A',
               Address: rec.Address || 'N/A',
               Province: prov,
               City: rec.City || 'N/A',
               Network: rec.Network || 'N/A',
               Status: rec.Status || 'Active',
               Gender: gen,
               Union_Council: rec.Union_Council || 'N/A'
           });
       }
    });
    
    return { found: formattedRecords.length > 0, records: formattedRecords };

  } catch (e) {
    console.error('Parse error:', e.message);
    return { found: false, records: [] };
  }
}

// Helper to map dynamic keys to our standard object
function assignValue(obj, keyStr, value) {
    if (!value) return;
    let val = value.trim();
    if (val === '') return;
    
    if (keyStr.includes('name') || keyStr.includes('owner')) obj.Name = val;
    else if (keyStr.includes('mobile') || keyStr.includes('number') || keyStr.includes('phone')) obj.Mobile = val;
    else if (keyStr.includes('cnic') || keyStr.includes('id')) obj.CNIC = val;
    else if (keyStr.includes('address') || keyStr.includes('location')) obj.Address = val;
    else if (keyStr.includes('city')) obj.City = val;
    else if (keyStr.includes('network') || keyStr.includes('operator')) obj.Network = val;
    else if (keyStr.includes('status')) obj.Status = val;
    else if (keyStr.includes('union') || keyStr.includes('uc')) obj.Union_Council = val;
}
