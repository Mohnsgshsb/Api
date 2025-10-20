const API_BASE_URL = 'http://localhost:3000'; // غير هذا إلى عنوان خادمك

document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const platform = document.getElementById('platform').value;
    const url = document.getElementById('url').value;
    const format = document.getElementById('format').value;
    
    // إخفاء النتائج السابقة
    document.getElementById('result').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/?platform=${platform}&url=${encodeURIComponent(url)}&format=${format}`);
        const data = await response.json();
        
        if (data.status) {
            // عرض النتائج
            document.getElementById('title').textContent = data.data.title;
            document.getElementById('type').textContent = data.data.type;
            document.getElementById('formatResult').textContent = data.data.format;
            document.getElementById('duration').textContent = data.data.duration;
            document.getElementById('thumbnail').src = data.data.thumbnail;
            document.getElementById('downloadLink').href = data.data.download;
            document.getElementById('result').style.display = 'block';
        } else {
            // عرض الخطأ
            document.getElementById('error').textContent = data.error || 'حدث خطأ غير معروف.';
            document.getElementById('error').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('error').textContent = 'فشل في الاتصال بالخادم. تحقق من الاتصال.';
        document.getElementById('error').style.display = 'block';
    }
});
