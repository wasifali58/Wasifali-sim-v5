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
  return Object.entries(COOKIES).map(([k, v]) => `${k}=${v}`).join('; ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { search } = req.method === 'GET' ? req.query : req.body;

  if (!search) {
    return res.send(JSON.stringify({
      success: false,
      message: '❌ Please provide a phone number (e.g., 03001234567)',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    }, null, 2));
  }

  const digits = search.replace(/\D/g, '');

  if (digits.length === 13) {
    return res.send(JSON.stringify({
      success: false,
      message: '❌ CNIC search is not allowed. Please provide a mobile number.',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    }, null, 2));
  }

  if (digits.length < 10 || digits.length > 13) {
    return res.send(JSON.stringify({
      success: false,
      message: '❌ Invalid phone number. Please enter a valid Pakistani number (e.g., 03001234567).',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    }, null, 2));
  }

  const phoneWithZero = digits.startsWith('0') ? digits : '0' + digits;

  try {
    const response = await axios.get(TARGET_URL, {
      params: { sim_info_mobile: phoneWithZero },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
      return res.send(JSON.stringify({
        success: true,
        message: `✅ Record found - ${result.records.length} record(s)`,
        records: result.records,
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      }, null, 2));
    } else {
      return res.send(JSON.stringify({
        success: false,
        message: '❌ No record found for this number',
        records: [],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      }, null, 2));
    }
  } catch (error) {
    return res.send(JSON.stringify({
      success: false,
      message: '⚠️ Error: ' + (error.message || 'Request failed'),
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    }, null, 2));
  }
};

function parseHTML(html, phone) {
  const records = [];
  try {
    let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    cleanHtml = cleanHtml.replace(/<meta[^>]*>/gi, ' ');
    cleanHtml = cleanHtml.replace(/<link[^>]*>/gi, ' ');
    cleanHtml = cleanHtml.replace(/<noscript[^>]*>.*?<\/noscript>/gi, ' ');
    cleanHtml = cleanHtml.replace(/\n|\r/g, ' ').replace(/&nbsp;/g, ' ');
    cleanHtml = cleanHtml.replace(/\s+/g, ' ');

    function extractTableField(keyword) {
      const regex = new RegExp(`<th[^>]*>\\s*${keyword}\\s*<\\/th>\\s*<td[^>]*>\\s*([\\s\\S]*?)\\s*<\\/td>`, 'i');
      const match = cleanHtml.match(regex);
      if (match && match[1]) {
        let val = match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (val.length > 0 && val.length < 200 && !/viewport|transform|opacity/i.test(val)) {
          return val;
        }
      }
      return 'N/A';
    }

    const name = extractTableField('Name');
    const finalName = name !== 'N/A' ? name : extractTableField('Owner');
    
    let cnic = extractTableField('CNIC');
    if (cnic === 'N/A') cnic = extractTableField('ID');
    const cnicDigits = cnic.replace(/\D/g, '');
    
    const address = extractTableField('Address');
    const city = extractTableField('City');
    let uc = extractTableField('Union Council');
    if (uc === 'N/A') uc = extractTableField('UC');
    let status = extractTableField('Status');
    if (status === 'N/A') status = 'Active';
    
    let network = extractTableField('Network');
    if (network === 'N/A') network = extractTableField('Operator');

    let gender = extractTableField('Gender');
    if (gender === 'N/A') gender = extractTableField('Sex');

    let province = extractTableField('Province');
    if (province === 'N/A' && cnicDigits.length === 13) {
      const firstDigit = cnicDigits.charAt(0);
      const provinceMap = {
        '1': 'Khyber Pakhtunkhwa', '2': 'FATA', '3': 'Punjab',
        '4': 'Sindh', '5': 'Balochistan', '6': 'Islamabad',
        '7': 'Gilgit-Baltistan', '8': 'AJK'
      };
      province = provinceMap[firstDigit] || 'N/A';
    }

    if (gender === 'N/A' && cnicDigits.length === 13) {
      const lastDigit = parseInt(cnicDigits.charAt(12));
      gender = (lastDigit % 2 === 0) ? 'Female' : 'Male';
    }

    if (finalName !== 'N/A' || cnicDigits !== '' || address !== 'N/A') {
      records.push({
        Name: finalName,
        Mobile: phone,
        CNIC: cnicDigits || 'N/A',
        Address: address,
        Province: province,
        City: city,
        Network: network,
        Status: status,
        Gender: gender,
        Union_Council: uc
      });
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
  return { found: records.length > 0, records };
}
