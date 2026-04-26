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
    // Direct GET request - same as browser
    const response = await axios.get('https://ownerdetail.datacorporation.com.pk/result-page/', {
      params: { sim_info_mobile: phoneWithZero },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://ownerdetail.datacorporation.com.pk/track-number/',
        'Cookie': '_ga=GA1.1.1455301204.1770130461; __gads=ID=d6cf01242b53db4b:T=1770130463:RT=1770130463:S=ALNI_MakDvPYZ9f0HxxsHhucgw_Dqo7ibQ'
      },
      timeout: 20000
    });

    const html = response.data;
    
    // Extract data from HTML response
    const result = extractSimData(html, phoneWithZero);
    
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
      message: '⚠️ Error: ' + error.message,
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }
};

function extractSimData(html, phone) {
  try {
    // Method 1: Look for JSON data in script tags
    const jsonMatch = html.match(/var\s+simData\s*=\s*({[^;]+})/i) ||
                      html.match(/{"name":"[^"]+","cnic":"[^"]+"/i);
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        return {
          found: true,
          records: [{
            Name: data.name || data.full_name || 'N/A',
            Mobile: phone,
            CNIC: data.cnic || data.nic || 'N/A',
            Address: data.address || data.permanent_address || 'N/A',
            Province: data.province || 'N/A',
            City: data.city || 'N/A',
            Network: data.network || data.operator || 'N/A',
            Status: data.status || 'Active',
            Gender: data.gender || 'N/A',
            Union_Council: data.union_council || data.uc || 'N/A'
          }]
        };
      } catch(e) {}
    }
    
    // Method 2: Extract from HTML elements
    const getValue = (pattern) => {
      const match = html.match(pattern);
      return match ? match[1].replace(/<[^>]*>/g, '').trim() : 'N/A';
    };
    
    const name = getValue(/Name<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                 getValue(/Owner[^>]*>([^<]+)</i) ||
                 html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] || 'N/A';
    
    const cnic = html.match(/\b\d{13}\b/)?.[0] || 'N/A';
    
    const address = getValue(/Address<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) || 'N/A';
    const province = getValue(/Province<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) || 'N/A';
    const city = getValue(/City<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) || 'N/A';
    const network = getValue(/Network<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                    html.match(/Jazz|Zong|Telenor|Ufone|Warid/i)?.[0] || 'N/A';
    const status = getValue(/Status<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) || 'Active';
    const gender = getValue(/Gender<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) || 'N/A';
    
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
