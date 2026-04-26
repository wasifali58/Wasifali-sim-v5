const axios = require('axios');

const TARGET_URL = 'https://ownerdetail.datacorporation.com.pk/result-page/';
const REFERER = 'https://ownerdetail.datacorporation.com.pk/track-number/';

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

function parseHTML(html, phone) {
  const records = [];
  
  try {
    // Extract all data using regex patterns
    const nameMatch = html.match(/Name[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/Owner[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/"name":"([^"]+)"/i) ||
                      html.match(/<strong>Name<\/strong>[:\s]*([^<]+)/i);
    
    const cnicMatch = html.match(/CNIC[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/"cnic":"([^"]+)"/i) ||
                      html.match(/\b\d{13}\b/);
    
    const addressMatch = html.match(/Address[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                         html.match(/"address":"([^"]+)"/i) ||
                         html.match(/<strong>Address<\/strong>[:\s]*([^<]+)/i);
    
    const provinceMatch = html.match(/Province[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                          html.match(/<strong>Province<\/strong>[:\s]*([^<]+)/i) ||
                          html.match(/Punjab|Sindh|KPK|Balochistan/i);
    
    const cityMatch = html.match(/City[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/<strong>City<\/strong>[:\s]*([^<]+)/i) ||
                      html.match(/Lahore|Karachi|Islamabad|Rawalpindi|Multan|Faisalabad/i);
    
    const networkMatch = html.match(/Network[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                         html.match(/Operator[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                         html.match(/Jazz|Zong|Telenor|Ufone|Warid/i);
    
    const statusMatch = html.match(/Status[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                        html.match(/Active|Inactive|Blocked|Suspended/i);
    
    const genderMatch = html.match(/Gender[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                        html.match(/Male|Female|M|F/i);
    
    const ucMatch = html.match(/Union\s*Council[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i) ||
                    html.match(/UC[:\s]*<[^>]*>([^<]+)<\/[^>]*>/i);
    
    const name = nameMatch ? cleanText(nameMatch[1]) : 'N/A';
    const cnic = cnicMatch ? cleanText(cnicMatch[1] || cnicMatch[0]) : 'N/A';
    const address = addressMatch ? cleanText(addressMatch[1]) : 'N/A';
    const province = provinceMatch ? cleanText(provinceMatch[1] || provinceMatch[0]) : 'N/A';
    const city = cityMatch ? cleanText(cityMatch[1] || cityMatch[0]) : 'N/A';
    const network = networkMatch ? cleanText(networkMatch[1] || networkMatch[0]) : 'N/A';
    const status = statusMatch ? cleanText(statusMatch[1] || statusMatch[0]) : 'N/A';
    const gender = genderMatch ? cleanText(genderMatch[1] || genderMatch[0]) : 'N/A';
    const unionCouncil = ucMatch ? cleanText(ucMatch[1]) : 'N/A';
    
    if (name !== 'N/A' || cnic !== 'N/A') {
      records.push({
        Name: name,
        Mobile: phone,
        CNIC: cnic,
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

function cleanText(text) {
  return String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  const cleanPhone = search.replace(/\D/g, '');
  const phoneWithZero = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone;

  try {
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
