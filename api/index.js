const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { search } = req.method === 'GET' ? req.query : req.body;

  if (!search) {
    return res.json({
      success: false,
      message: '❌ Please provide phone number',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }

  const cleanPhone = search.replace(/\D/g, '');
  const phoneWithZero = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone;

  try {
    // Option 1: Pehle home page visit karo (session lene ke liye)
    await axios.get('https://ownerdetail.datacorporation.com.pk/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // Option 2: Track page visit karo
    await axios.get('https://ownerdetail.datacorporation.com.pk/track-number/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://ownerdetail.datacorporation.com.pk/',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Option 3: Ab result page call karo
    const response = await axios.get('https://ownerdetail.datacorporation.com.pk/result-page/', {
      params: { sim_info_mobile: phoneWithZero },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ur-PK;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://ownerdetail.datacorporation.com.pk/track-number/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000,
      maxRedirects: 5
    });

    const html = response.data;
    
    // Check if we got actual data
    if (html.includes('No record') || html.includes('not found') || html.length < 500) {
      return res.json({
        success: false,
        message: '❌ No record found for this number',
        records: [],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    }
    
    const result = extractDataFromHTML(html, phoneWithZero);
    
    return res.json({
      success: result.found,
      message: result.found ? `✅ Record found` : '❌ No record found',
      records: result.records,
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });

  } catch (error) {
    return res.json({
      success: false,
      message: '⚠️ ' + error.message,
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }
};

function extractDataFromHTML(html, phone) {
  try {
    // Try to find data in table format
    const extract = (label) => {
      const patterns = [
        new RegExp(`${label}[\\s:]*<\\/td>\\s*<td[^>]*>([^<]+)<\\/td>`, 'i'),
        new RegExp(`${label}[\\s:]*<[^>]*>([^<]+)<`, 'i'),
        new RegExp(`${label}[\\s:]*([^<\\n]+)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1] && !match[1].includes('undefined')) {
          return match[1].replace(/<[^>]*>/g, '').trim();
        }
      }
      return 'N/A';
    };
    
    const name = extract('Name') || extract('Owner') || 'N/A';
    const cnic = html.match(/\b\d{13}\b/)?.[0] || 'N/A';
    const address = extract('Address') || 'N/A';
    const province = extract('Province') || 'N/A';
    const city = extract('City') || extract('District') || 'N/A';
    const network = html.match(/Jazz|Zong|Telenor|Ufone|Warid/i)?.[0] || extract('Network') || 'N/A';
    const status = extract('Status') || 'Active';
    const gender = extract('Gender') || 'N/A';
    
    if (name === 'N/A' && cnic === 'N/A') {
      return { found: false, records: [] };
    }
    
    return {
      found: true,
      records: [{
        Name: name,
        Mobile: phone,
        CNIC: cnic,
        Address: address,
        Province: province,
        City: city,
        Network: network,
        Status: status,
        Gender: gender,
        Union_Council: 'N/A'
      }]
    };
    
  } catch(e) {
    return { found: false, records: [] };
  }
}
