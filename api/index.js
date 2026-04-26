// api/index.js - Using their admin-ajax.php
const axios = require('axios');

const AJAX_URL = 'https://ownerdetail.datacorporation.com.pk/wp-admin/admin-ajax.php';
const NONCE = 'e33826f1b7';

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
    // Method 1: Try AJAX API first
    const formData = new URLSearchParams();
    formData.append('action', 'sim_info_fetch');  // Action from site
    formData.append('nonce', NONCE);
    formData.append('sim_info_mobile', phoneWithZero);

    const response = await axios.post(AJAX_URL, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    });

    // If AJAX returns data
    if (response.data && response.data.success) {
      const data = response.data.data;
      
      return res.json({
        success: true,
        message: '✅ Record found',
        records: [{
          Name: data.name || data.full_name || 'N/A',
          Mobile: phoneWithZero,
          CNIC: data.cnic || data.nic || 'N/A',
          Address: data.address || data.permanent_address || 'N/A',
          Province: data.province || 'N/A',
          City: data.city || data.district || 'N/A',
          Network: data.network || data.operator || 'N/A',
          Status: data.status || 'N/A',
          Gender: data.gender || 'N/A',
          Union_Council: data.union_council || data.uc || 'N/A'
        }],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    }

    // Method 2: If AJAX fails, fallback to HTML parsing
    const htmlResponse = await axios.get('https://ownerdetail.datacorporation.com.pk/result-page/', {
      params: { sim_info_mobile: phoneWithZero },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://ownerdetail.datacorporation.com.pk/track-number/'
      }
    });

    const html = htmlResponse.data;
    const result = parseHTMLData(html, phoneWithZero);

    return res.json({
      success: true,
      message: result.found ? '✅ Record found' : '❌ No record found',
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

function parseHTMLData(html, phone) {
  const records = [];
  
  try {
    // Extract data from Elementor blocks
    const extractFromElementor = (label) => {
      const regex = new RegExp(`${label}[^<]*<[^>]*>\\s*<[^>]*>\\s*([^<]+)`, 'i');
      const match = html.match(regex);
      return match ? match[1].trim() : null;
    };
    
    const name = html.match(/Name[:\s]*<[^>]*>([^<]+)/i)?.[1] ||
                 extractFromElementor('Name') || 'N/A';
    
    const cnic = html.match(/\b\d{13}\b/)?.[0] || 'N/A';
    
    const address = html.match(/Address[:\s]*<[^>]*>([^<]+)/i)?.[1] || 'N/A';
    const province = html.match(/Province[:\s]*<[^>]*>([^<]+)/i)?.[1] || 'N/A';
    const city = html.match(/City[:\s]*<[^>]*>([^<]+)/i)?.[1] || 'N/A';
    const network = html.match(/Network[:\s]*<[^>]*>([^<]+)/i)?.[1] ||
                    html.match(/Jazz|Zong|Telenor|Ufone/i)?.[0] || 'N/A';
    const status = html.match(/Status[:\s]*<[^>]*>([^<]+)/i)?.[1] || 'N/A';
    const gender = html.match(/Gender[:\s]*<[^>]*>([^<]+)/i)?.[1] || 'N/A';
    
    records.push({
      Name: cleanValue(name),
      Mobile: phone,
      CNIC: cnic,
      Address: cleanValue(address),
      Province: cleanValue(province),
      City: cleanValue(city),
      Network: cleanValue(network),
      Status: cleanValue(status),
      Gender: cleanValue(gender),
      Union_Council: 'N/A'
    });
    
  } catch (e) {
    console.error('Parse error:', e.message);
  }
  
  return {
    found: records[0]?.Name !== 'N/A',
    records: records
  };
}

function cleanValue(val) {
  if (!val || val === 'N/A') return 'N/A';
  return String(val).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
