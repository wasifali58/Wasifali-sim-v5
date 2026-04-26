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

// Convert cookies object to string
function getCookieString() {
  return Object.entries(COOKIES)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { search } = req.method === 'GET' ? req.query : req.body;

  if (!search) {
    return res.json({
      success: false,
      message: '❌ Please provide search parameter (Phone Number)',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }

  // Clean phone number
  const cleanPhone = search.replace(/\D/g, '');
  const phoneWithZero = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone;

  try {
    // Call their API
    const response = await axios.get(TARGET_URL, {
      params: { sim_info_mobile: phoneWithZero },
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
    
    // Parse HTML to extract data
    const result = parseHTML(html, phoneWithZero);

    if (result.found) {
      return res.json({
        success: true,
        message: `✅ Record found - ${result.records.length} record(s)`,
        records: result.records,
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    } else {
      return res.json({
        success: false,
        message: '❌ No record found for this number',
        records: [],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    }

  } catch (error) {
    return res.json({
      success: false,
      message: '⚠️ Error: ' + error.message,
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }
};

// HTML parsing function with Advanced Extraction
function parseHTML(html, phone) {
  const records = [];
  
  try {
    // Clean HTML to make parsing easier (remove line breaks & extra spaces)
    const cleanHtml = html.replace(/\n|\r/g, ' ').replace(/&nbsp;/g, ' ');

    // Dynamic field extractor function
    function extractField(keyword) {
      // Pattern 1: Matches Table structures <td>Keyword</td> <td>Value</td>
      let regex = new RegExp(`${keyword}[^<]*<\/(?:td|th|span|div|strong|b)>\\s*<(?:td|th|span|div)[^>]*>\\s*([^<]+)`, 'i');
      let match = cleanHtml.match(regex);
      if (match && match[1].trim() !== '') return match[1].trim();

      // Pattern 2: Matches Keyword : Value
      regex = new RegExp(`${keyword}\\s*[:=-]\\s*(?:<[^>]+>)*\\s*([^<]+)`, 'i');
      match = cleanHtml.match(regex);
      if (match && match[1].trim() !== '') return match[1].trim();
      
      // Pattern 3: Fallback for generic tags
      regex = new RegExp(`(?:>|"${keyword}"?[:>\\s]*)(?:<[^>]+>)*${keyword}(?:<[^>]+>)*[:\\s]*(?:<[^>]+>)*([^<]+)`, 'i');
      match = cleanHtml.match(regex);
      if (match && match[1].trim() !== '') return match[1].trim();

      return 'N/A';
    }

    // Extract Basic Fields
    const name = extractField('Name') !== 'N/A' ? extractField('Name') : extractField('Owner');
    const cnicRaw = extractField('CNIC') !== 'N/A' ? extractField('CNIC') : extractField('ID');
    const cnic = cnicRaw.replace(/\D/g, ''); // Keep only numbers
    const address = extractField('Address');
    const city = extractField('City');
    const unionCouncil = extractField('Union Council') !== 'N/A' ? extractField('Union Council') : extractField('UC');
    const status = extractField('Status') !== 'N/A' ? extractField('Status') : 'Active';
    
    // Extract Network directly from site
    let network = extractField('Network');
    if (network === 'N/A') {
      network = extractField('Operator');
    }

    // Auto-detect Province and Gender from CNIC Logic
    let province = 'N/A';
    let gender = 'N/A';

    if (cnic.length >= 13) {
      // 1. Gender check (Last digit: Odd = Male, Even = Female)
      const lastDigit = parseInt(cnic.charAt(12));
      gender = (lastDigit % 2 === 0) ? 'Female' : 'Male';

      // 2. Province check (First digit)
      const firstDigit = cnic.charAt(0);
      const provinceMap = {
        '1': 'Khyber Pakhtunkhwa',
        '2': 'FATA',
        '3': 'Punjab',
        '4': 'Sindh',
        '5': 'Balochistan',
        '6': 'Islamabad',
        '7': 'Gilgit-Baltistan',
        '8': 'AJK'
      };
      province = provinceMap[firstDigit] || 'N/A';
    }

    if (name !== 'N/A' || cnic !== '' || address !== 'N/A') {
      records.push({
        Name: name,
        Mobile: phone,
        CNIC: cnic || 'N/A',
        Address: address,
        Province: province,
        City: city,
        Network: network,
        Status: status,
        Gender: gender,
        Union_Council: unionCouncil
      });
    }
    
  } catch (e) {
    console.error('Parse error:', e.message);
  }
  
  return {
    found: records.length > 0,
    records: records
  };
}
