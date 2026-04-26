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

// HTML parsing function
function parseHTML(html, phone) {
  const records = [];
  
  try {
    // Pattern 1: Name extraction
    const nameMatch = html.match(/Name[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/Owner[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/Customer[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/"name":"([^"]+)"/i);
    
    // Pattern 2: CNIC extraction  
    const cnicMatch = html.match(/CNIC[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/ID[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/"cnic":"([^"]+)"/i) ||
                      html.match(/\d{13}/);
    
    // Pattern 3: Address extraction
    const addressMatch = html.match(/Address[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                         html.match(/"address":"([^"]+)"/i);
    
    // Pattern 4: Network extraction
    const networkMatch = html.match(/Network[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                         html.match(/Operator[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i);
    
    const name = nameMatch ? nameMatch[1].trim() : 'N/A';
    const cnic = cnicMatch ? (cnicMatch[1] || cnicMatch[0]).replace(/\D/g, '') : 'N/A';
    const address = addressMatch ? addressMatch[1].trim() : 'N/A';
    const network = networkMatch ? networkMatch[1].trim() : detectNetwork(phone);
    
    if (name !== 'N/A' || cnic !== 'N/A') {
      records.push({
        Name: name,
        Mobile: phone,
        CNIC: cnic,
        Address: address,
        Network: network
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

// Network detection function
function detectNetwork(phone) {
  const clean = phone.replace(/\D/g, '');
  const prefix = clean.substring(0, 4);
  
  const networks = {
    '0300': 'Jazz', '0301': 'Jazz', '0302': 'Jazz', '0303': 'Jazz', '0304': 'Jazz',
    '0305': 'Jazz', '0306': 'Jazz', '0307': 'Jazz', '0308': 'Jazz', '0309': 'Jazz',
    '0310': 'Zong', '0311': 'Zong', '0312': 'Zong', '0313': 'Zong', '0314': 'Zong',
    '0315': 'Zong', '0316': 'Zong', '0317': 'Zong', '0318': 'Zong', '0319': 'Zong',
    '0320': 'Warid', '0321': 'Warid', '0322': 'Warid', '0323': 'Warid', '0324': 'Warid',
    '0330': 'Ufone', '0331': 'Ufone', '0332': 'Ufone', '0333': 'Ufone', '0334': 'Ufone',
    '0335': 'Ufone', '0336': 'Ufone',
    '0340': 'Telenor', '0341': 'Telenor', '0342': 'Telenor', '0343': 'Telenor',
    '0344': 'Telenor', '0345': 'Telenor', '0346': 'Telenor', '0347': 'Telenor'
  };
  
  return networks[prefix] || 'Unknown';
}
