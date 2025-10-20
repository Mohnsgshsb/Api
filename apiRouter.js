import express from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = express.Router();

// كائن "api" البسيط الذي يحتوي على عدة APIs
const api = {
  youtube: {
    // نفس الكود الأصلي لـ savetube (يوتيوب)
    api: {
      base: "https://media.savetube.me/api",
      cdn: "/random-cdn",
      info: "/v2/info",
      download: "/download"
    },
    headers: {
      'accept': '*/*',
      'content-type': 'application/json',
      'origin': 'https://yt.savetube.me',
      'referer': 'https://yt.savetube.me/',
      'user-agent': 'Postify/1.0.0'
    },
    formats: ['144', '240', '360', '480', '720', '1080', 'mp3'],

    crypto: {
      hexToBuffer: (hexString) => {
        const matches = hexString.match(/.{1,2}/g);
        return Buffer.from(matches.join(''), 'hex');
      },
      decrypt: async (enc) => {
        const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
        const data = Buffer.from(enc, 'base64');
        const iv = data.slice(0, 16);
        const content = data.slice(16);
        const key = api.youtube.crypto.hexToBuffer(secretKey);
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = decipher.update(content);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString());
      }
    },

    isUrl: str => {
      try { new URL(str); return true; } catch (_) { return false; }
    },

    youtube: url => {
      const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/
      ];
      for (let pattern of patterns) {
        if (pattern.test(url)) return url.match(pattern)[1];
      }
      return null;
    },

    request: async (endpoint, data = {}, method = 'post') => {
      try {
        const { data: response } = await axios({
          method,
          url: `${endpoint.startsWith('http') ? '' : api.youtube.api.base}${endpoint}`,
          data: method === 'post' ? data : undefined,
          params: method === 'get' ? data : undefined,
          headers: api.youtube.headers
        });
        return { status: true, code: 200, data: response };
      } catch (error) {
        return { status: false, code: error.response?.status || 500, error: error.message };
      }
    },

    getCDN: async () => {
      const response = await api.youtube.request(api.youtube.api.cdn, {}, 'get');
      if (!response.status) return response;
      return { status: true, code: 200, data: response.data.cdn };
    },

    download: async (link, format) => {
      if (!api.youtube.isUrl(link)) return { status: false, code: 400, error: "الرابط غير صالح." };
      if (!format || !api.youtube.formats.includes(format)) return { status: false, code: 400, error: "صيغة غير مدعومة." };

      const id = api.youtube.youtube(link);
      if (!id) return { status: false, code: 400, error: "تعذر استخراج معرف الفيديو." };

      const cdnx = await api.youtube.getCDN();
      if (!cdnx.status) return cdnx;
      const cdn = cdnx.data;

      const result = await api.youtube.request(`https://${cdn}${api.youtube.api.info}`, {
        url: `https://www.youtube.com/watch?v=${id}`
      });

      if (!result.status || !result.data?.data)
        return { status: false, code: 500, error: "لم يتم استلام بيانات مشفرة." };

      const decrypted = await api.youtube.crypto.decrypt(result.data.data);

      const dl = await api.youtube.request(`https://${cdn}${api.youtube.api.download}`, {
        id: id,
        downloadType: format === 'mp3' ? 'audio' : 'video',
        quality: format === 'mp3' ? '128' : format,
        key: decrypted.key
      });

      return {
        status: true,
        code: 200,
        result: {
          title: decrypted.title,
          type: format === 'mp3' ? 'audio' : 'video',
          format,
          thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          download: dl.data.data.downloadUrl,
          duration: decrypted.duration
        }
      };
    }
  },

  // API إضافي كمثال: لفيسبوك (استبدل بـ API حقيقي إذا كان لديك)
  facebook: {
    formats: ['720', '1080', 'mp4'], // صيغ افتراضية
    download: async (link, format) => {
      // منطق بسيط كمثال (استبدل بـ API حقيقي مثل من خدمة تحميل فيسبوك)
      if (!link.includes('facebook.com')) return { status: false, code: 400, error: "رابط فيسبوك غير صالح." };
      if (!format || !api.facebook.formats.includes(format)) return { status: false, code: 400, error: "صيغة غير مدعومة." };

      // محاكاة تحميل (استبدل بطلب حقيقي)
      return {
        status: true,
        code: 200,
        result: {
          title: "فيديو فيسبوك مثال",
          type: 'video',
          format,
          thumbnail: "https://example.com/thumbnail.jpg",
          download: `https://example.com/download?link=${encodeURIComponent(link)}&format=${format}`,
          duration: "00:30"
        }
      };
    }
  }
};

// API route المعدل ليتعامل مع عدة APIs
router.get('/', async (req, res) => {
  try {
    const platform = req.query.platform; // إضافة معامل لاختيار المنصة (مثل 'youtube' أو 'facebook')
    const url = req.query.url;
    const format = req.query.format || '720';
    
    if (!platform || !api[platform]) return res.status(400).json({ status: false, error: "منصة غير مدعومة." });
    if (!url) return res.status(400).json({ status: false, error: "يرجى إدخال الرابط." });

    const result = await api[platform].download(url, format);
    if (!result.status) return res.status(result.code).json(result);

    res.json({
      status: true,
      creator: "Dark-Team",
      data: result.result
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
